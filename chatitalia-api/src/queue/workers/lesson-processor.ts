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

const NUM_WORKERS = process.env.NUM_WORKERS ? parseInt(process.env.NUM_WORKERS) : 5;

async function processLesson(jobData: LessonJobData): Promise<LessonJobResult> {
  try {
    logger.info(
      { lessonId: jobData.lessonId, userId: jobData.userId, title: jobData.title },
      'Processing lesson'
    );

    // Generate idempotent hash from lesson title passed in jobData
    const lessonHash = generateLessonHash(jobData.title);

    // Check if lesson with same title (hash) already exists
    let lesson = await mongoDb.findOne('lessons', { lessonHash });

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
    //       level: lesson.level,
    //       lessonContent: lesson.lessonContent,
    //       themes: lesson.themes,
    //       skipped: true,
    //       message: 'Lesson was already processed'
    //     },
    //   };
    // }

    if (!lesson) {
      throw new Error("We dont find the lesson")
    }
    await mongoDb.updateOne(
      'lessons',
      { lessonHash },
      { status: 'PENDING' }
    );

    // Get file from S3 emulator
    const fileBuffer = await s3.getObject(lesson.fileUri);
    logger.info({ fileUri: lesson.fileUri, size: fileBuffer.length }, 'Retrieved file from S3 emulator');

    // Initialize LLM
    const llm = new LLMService();

    // Extract text from PDF using lesson's page definitions
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

    const metadataPrompt = `Analyze the following Italian lesson content and return only valid JSON with this exact structure: {"level":"a1|a2|b1|b2","themes":["theme 1","theme 2"]}. Choose one level and identify the main themes. Do not include Markdown, explanations, or any additional text.\n\nLESSON CONTENT:\n${lessonResponse.data}`;
    const metadataResponse = await llm.run<{ level: string; themes: string[] }>(
      'You extract structured metadata from Italian language lessons. Return valid JSON only.',
      metadataPrompt,
      true
    );

    if (!metadataResponse.success || !metadataResponse.data) {
      throw new Error(`Failed to extract lesson metadata: ${metadataResponse.error}`);
    }

    const lessonData = {
      lesson: lessonResponse.data,
      level: metadataResponse.data.level,
      themes: metadataResponse.data.themes,
    };

    logger.info(
      { lessonHash, themesCount: lessonData.themes.length },
      'Lesson generated successfully'
    );

    const validLevels = ['a1', 'a2', 'b1', 'b2'];
    const llmLevel = lessonData.level ? lessonData.level.toLowerCase() : 'a1';
    const finalLevel = validLevels.includes(llmLevel) ? llmLevel : 'a1';

    // Update lesson status in MongoDB using lessonHash with generated content
    await mongoDb.updateOne(
      'lessons',
      { lessonHash },
      {
        status: 'PROCESSED',
        level: finalLevel,
        lessonContent: lessonData.lesson,
        themes: lessonData.themes,
        updatedAt: new Date().toISOString()
      }
    );

    for (const theme of lessonData.themes) {
      await mongoDb.insertOne('themes', {
        themeId: uuidv4(),
        lessonId: lesson.lessonId,
        level: finalLevel,
        theme,
        createdAt: new Date().toISOString()
      });
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
        level: finalLevel,
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

    // Update lesson status with error using lessonHash
    try {
      const lessonHash = generateLessonHash(jobData.title);
      await mongoDb.updateOne(
        'lessons',
        { lessonHash },
        { status: 'ERROR_PROCESSING', error: error.message, updatedAt: new Date().toISOString() }
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
