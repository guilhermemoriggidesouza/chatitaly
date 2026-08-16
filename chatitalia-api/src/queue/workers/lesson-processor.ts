import { lessonQueue, LessonJobData, LessonJobResult } from '../queue';
import { LLMService } from '../../infra/llm';
import { mongoDb } from '../../infra/mongodb';
import { s3 } from '../../infra/s3';
import logger from '../../logger';
import * as pdfjsLib from 'pdfjs-dist';
import { buildLessonGeneratorPrompt } from '../../prompts/lesson-generator';
import crypto from 'crypto';

const NUM_WORKERS = process.env.NUM_WORKERS ? parseInt(process.env.NUM_WORKERS) : 5;

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Generate idempotent hash from lesson title
function generateLessonHash(title: string): string {
  return crypto.createHash('sha256').update(title).digest('hex');
}

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
    
    if (lesson && lesson.status === 'PROCESSED') {
      logger.info(
        { lessonId: jobData.lessonId, existingLessonId: lesson.lessonId, lessonHash },
        'Lesson already processed, skipping'
      );
      
      return {
        lessonId: lesson.lessonId,
        status: 'completed',
        data: {
          fileUri: lesson.fileUri,
          title: lesson.title,
          pages: lesson.pages,
          pagesProcessed: 0,
          lessonContent: lesson.lessonContent,
          themes: lesson.themes,
          skipped: true,
          message: 'Lesson was already processed'
        },
      };
    }
    if(!lesson) {
      throw new Error("We dont find the lesson")
    }
    // Get file from S3 emulator
    const fileBuffer = await s3.getObject(lesson.fileUri);
    logger.info({ fileUri: lesson.fileUri, size: fileBuffer.length }, 'Retrieved file from S3 emulator');

    // Initialize LLM
    const llm = new LLMService();

    // Extract text from PDF using lesson's page definitions
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
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
    const userPrompt = `Com base no seguinte conteúdo extraído do PDF, crie uma lição completa em português (Brasil) que resuma e explique todo o conteúdo de forma clara e estruturada. Depois, liste os temas principais relacionados à lição. Retorne um JSON com os campos: "lesson" (string Markdown com a lição completa) e "themes" (array de strings com os temas).`;
    
    const llmResponse = await llm.run(systemPrompt, userPrompt, true);
    
    if (!llmResponse.success) {
      throw new Error(`Failed to generate lesson: ${llmResponse.error}`);
    }

    const lessonData = llmResponse.data as { lesson: string; themes: string[] };
    
    logger.info(
      { lessonHash, themesCount: lessonData.themes.length },
      'Lesson generated successfully'
    );

    // Update lesson status in MongoDB using lessonHash with generated content
    await mongoDb.updateOne(
      'lessons',
      { lessonHash },
      {
        status: 'PROCESSED',
        lessonContent: lessonData.lesson,
        themes: lessonData.themes,
        updatedAt: new Date().toISOString()
      }
    );

    // Save themes in themes collection
    for (const theme of lessonData.themes) {
      await mongoDb.insertOne('themes', {
        lessonHash,
        level: lesson.level || 'beginner',
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
