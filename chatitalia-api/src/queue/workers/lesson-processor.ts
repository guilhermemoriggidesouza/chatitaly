import { lessonQueue, LessonJobData, LessonJobResult } from '../queue';
import { LLMService } from '../../infra/llm';
import { mongoDb } from '../../infra/mongodb';
import { s3 } from '../../infra/s3';
import logger from '../../logger';
import '../../infra/pdfjs-compat';
import * as pdfjsLib from 'pdfjs-dist';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { buildLessonGeneratorPrompt } from '../../prompts/lesson-generator';
import { generateLessonHash } from '../../utils/hash';
import { ragService } from '../../services/rag-service';

const NUM_WORKERS = process.env.NUM_WORKERS ? parseInt(process.env.NUM_WORKERS) : 5;

async function processLesson(jobData: LessonJobData): Promise<LessonJobResult> {
  try {
    logger.info(
      { lessonId: jobData.lessonId, userId: jobData.userId, title: jobData.title },
      'Processing lesson'
    );
    const lessonHash = generateLessonHash(jobData.title);
    // Filtra pelo lessonId (único). O lessonHash não é mais único: dois livros
    // podem ter um capítulo com o mesmo título.
    let lesson = await mongoDb.findOne('lessons', { lessonId: jobData.lessonId });

    //REPROCESSAMENTO OFF
    // if (lesson && lesson.status === 'PROCESSED') {
    //   logger.info(
    //     { lessonId: jobData.lessonId, existingLessonId: lesson.lessonId, lessonHash },
    //     'Lesson already processed, skipping'
    //   );

    //   return {
    //     lessonId: lesson.lessonId,
    //     status: 'completed',
    //     data: {
    //       fileUri: lesson.fileUri,
    //       title: lesson.title,
    //       pages: lesson.pages,
    //       pagesProcessed: 0,
    //       lessonContent: lesson.lessonContent,
    //       message: 'Lesson was already processed'
    //     },
    //   };
    // }

    //REPROCESSAMENTO ON
    await mongoDb.updateOne(
      'lessons',
      { lessonId: jobData.lessonId },
      { $set: { status: 'PENDING' } }
    );

    if (!lesson) {
      throw new Error("We dont find the lesson")
    }
    const fileBuffer = await s3.getObject(lesson.fileUri);
    logger.info({ fileUri: lesson.fileUri, size: fileBuffer.length }, 'Retrieved file from S3 emulator');
    const llm = new LLMService();
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
      disableWorker: true,
      standardFontDataUrl: path.join(
        process.cwd(),
        'node_modules/pdfjs-dist/standard_fonts/'
      ),
    } as any).promise;
    const pagesToProcess = lesson.pages || []; // Use pages from lesson or empty array
    let pdfContent = '';

    for (const pageNum of pagesToProcess) {
      if (pageNum >= 1 && pageNum <= pdf.numPages) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        pdfContent += `\n--- Page ${pageNum} ---\n${pageText}`;
      }
    }

    logger.info({ lessonId: lesson.lessonId, lessonHash }, 'Extracted PDF content');

    // Generate lesson content using LLM
    const systemPrompt = buildLessonGeneratorPrompt(pdfContent);
    const userPrompt = 'Create only the complete lesson in Markdown. Write explanations in Brazilian Portuguese and keep Italian words, examples, sentences, and expressions in Italian. Do not return JSON or metadata.';

    const lessonResponse = await llm.run<string>(systemPrompt, userPrompt, false);

    if (!lessonResponse.success || !lessonResponse.data) {
      throw new Error(`Failed to generate lesson: ${lessonResponse.error}`);
    }

    const metadataPrompt = `Analyze the following Italian lesson content and return only valid JSON with this exact structure: {"level":"a1|a2|b1|b2","themes":["tema 1","tema 2"]}. Choose one level and identify the main themes. Every value in themes must be written entirely in Italian. Never use Portuguese, English, translations, or explanatory text for a theme. Do not include Markdown, explanations, or any additional text.\n\nLESSON CONTENT:\n${lessonResponse.data}`;
    const metadataResponse = await llm.run<{ level: string; themes: string[] }>(
      'You extract structured metadata from Italian language lessons. Return valid JSON only. Theme names must always be written entirely in Italian.',
      metadataPrompt,
      true
    );

    if (!metadataResponse.success || !metadataResponse.data) {
      throw new Error(`Failed to extract lesson metadata: ${metadataResponse.error}`);
    }

    const lessonData = {
      lesson: lessonResponse.data,
      themes: metadataResponse.data.themes,
    };

    logger.info(
      { lessonHash, themesCount: lessonData.themes.length },
      'Lesson generated successfully'
    );

    // Update lesson status in MongoDB using lessonHash with generated content
    await mongoDb.updateOne(
      'lessons',
      { lessonId: jobData.lessonId },
      {
        $set: {
          status: 'PROCESSED',
          lessonContent: lessonData.lesson,
          updatedAt: new Date().toISOString()
        }
      }
    );

    for (const theme of lessonData.themes) {
      await mongoDb.insertOne('themes', {
        themeId: uuidv4(),
        lessonId: lesson.lessonId,
        theme,
        createdAt: new Date().toISOString()
      });
    }

    // RAG de lição: indexa o `lessonContent` (já limpo, sem ruído de PDF) pro
    // plain-node/conversational-node buscarem contexto do tema atual. Não
    // trava o processamento se falhar (Neo4j fora, etc.).
    try {
      await ragService.ingest(lesson.lessonId, lessonData.lesson);
    } catch (ragError: any) {
      logger.warn({ lessonId: lesson.lessonId, error: ragError.message }, 'RAG de lição falhou, seguindo sem isso');
    }

    logger.info({ lessonHash, themesCount: lessonData.themes.length }, 'Lesson processed and updated in MongoDB');

    return {
      lessonId: lesson.lessonId,
      status: 'completed',
      data: {
        fileUri: lesson.fileUri,
        title: lesson.title,
        pages: lesson.pages,
        pagesProcessed: pagesToProcess.length,
        lessonContent: lessonData.lesson,
        themes: lessonData.themes,
        lessonHash
      },
    };
  } catch (error: any) {
    logger.error(
      { lessonId: jobData.lessonId, error: error.message },
      'Error processing lesson'
    );

    // Update lesson status with error
    try {
      await mongoDb.updateOne(
        'lessons',
        { lessonId: jobData.lessonId },
        { $set: { status: 'ERROR_PROCESSING', error: error.message, updatedAt: new Date().toISOString() } }
      );
    } catch (updateError: any) {
      logger.error({ lessonId: jobData.lessonId, error: updateError.message }, 'Failed to update lesson error status');
    }

    return {
      lessonId: jobData.lessonId,
      status: 'failed',
      error: error.message,
    };
  }
}

export async function registerWorker() {
  try {
    logger.info({ numWorkers: NUM_WORKERS }, 'Registering lesson queue processor');

    // Register processor with concurrency settings
    lessonQueue.process(NUM_WORKERS, async (job) => {
      try {
        const result = await processLesson(job.data);

        if (result.status === 'failed') {
          throw new Error(result.error);
        }

        job.progress(100);
        return result;
      } catch (error: any) {
        logger.error({ jobId: job.id, error: error.message }, 'Job processing failed');
        throw error;
      }
    });

    logger.info({ numWorkers: NUM_WORKERS }, 'Processor registered and listening for jobs');
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to register worker');
    throw error;
  }
}

export { processLesson };
