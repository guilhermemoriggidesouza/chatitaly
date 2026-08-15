import { lessonQueue, LessonJobData, LessonJobResult } from '../queue';
import { LLMService } from '../../infra/llm';
import { mongoDb } from '../../infra/mongodb';
import { s3 } from '../../infra/s3';
import logger from '../../logger';
import * as pdfjsLib from 'pdfjs-dist';

const NUM_WORKERS = process.env.NUM_WORKERS ? parseInt(process.env.NUM_WORKERS) : 5;

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

async function processLesson(jobData: LessonJobData): Promise<LessonJobResult> {
  try {
    logger.info(
      { lessonId: jobData.lessonId, userId: jobData.userId },
      'Processing lesson'
    );

    // Retrieve lesson from MongoDB using lessonId
    const lesson = await mongoDb.findOne('lessons', { lessonId: jobData.lessonId });

    if (!lesson) {
      throw new Error(`Lesson not found: ${jobData.lessonId}`);
    }

    logger.info({ lessonId: jobData.lessonId, fileUri: lesson.fileUri }, 'Retrieved lesson from MongoDB');

    // Get file from S3 emulator
    const fileBuffer = await s3.getObject(lesson.fileUri);
    logger.info({ fileUri: lesson.fileUri, size: fileBuffer.length }, 'Retrieved file from S3 emulator');

    // Initialize LLM
    const llm = new LLMService();

    // Extract text from PDF (using first 5 pages for processing)
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    const maxPages = Math.min(5, pdf.numPages);
    let pdfContent = '';

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      pdfContent += `\n--- Page ${i} ---\n${pageText}`;
    }

    logger.info({ lessonId: jobData.lessonId, pagesExtracted: maxPages }, 'Extracted PDF content');

    // TODO: Process lesson content with LLM
    // const result = await llm.run(systemPrompt, pdfContent, true);

    // Update lesson status in MongoDB
    await mongoDb.updateOne(
      'lessons',
      { lessonId: jobData.lessonId },
      { status: 'PROCESSED', updatedAt: new Date().toISOString() }
    );

    logger.info({ lessonId: jobData.lessonId }, 'Lesson processed and updated in MongoDB');

    return {
      lessonId: jobData.lessonId,
      status: 'completed',
      data: {
        fileUri: lesson.fileUri,
        title: lesson.title,
        pages: lesson.pages,
        pagesProcessed: maxPages,
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
