import express, { Request, Response } from 'express';
import path from 'path';
import '../infra/pdfjs-compat';
import * as pdfjsLib from 'pdfjs-dist';
import { LLMService } from '../infra/llm';
import { mongoDb } from '../infra/mongodb';
import { s3 } from '../infra/s3';
import logger from '../logger';
import { v4 as uuidv4 } from 'uuid';
import { buildPdfSummaryPrompt } from '../prompts/pdf-summary-agent';
import { addLessonJob } from '../queue/queue';
import { generateLessonHash } from '../utils/hash';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// A lista de lições do usuário vive em GET /user/lessons.

// Conteúdo completo (markdown) de uma lição, buscado quando o usuário a abre.
router.get('/lessons/:lessonId', requireAuth(), async (req: Request, res: Response) => {
  const { lessonId } = req.params;

  try {
    const lesson = await mongoDb.findOne('lessons', { lessonId });

    if (!lesson) {
      return res.status(404).json({ error: 'lesson not found' });
    }

    logger.info({ lessonId }, 'Retrieved lesson content');

    return res.status(200).json(lesson);
  } catch (error: any) {
    logger.error({ lessonId, error: error.message }, 'Error retrieving lesson');

    return res.status(500).json({
      error: 'Error retrieving lesson',
      detail: error.message,
    });
  }
});

interface PDFResponse {
  chapters: Array<{
    title: string;
    start_page: number;
    end_page: number;
    order: number;
  }>;
  toc_found: boolean;
  total_chapters?: number;
}

/**
 * Extract text from first N pages of PDF using S3 emulator
 */
async function extractPdfPages(fileUri: string, maxPages: number = 20): Promise<string> {
  try {
    const fileBuffer = await s3.getObject(fileUri);
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
      disableWorker: true,
      standardFontDataUrl: path.join(
        process.cwd(),
        'node_modules/pdfjs-dist/standard_fonts/'
      ),
    } as any).promise;

    const numPages = Math.min(maxPages, pdf.numPages);
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }

    return fullText;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error extracting pages');
    throw error;
  }
}

/**
 * POST /pdf/process
 * Process a PDF file to extract chapters and create lessons
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { fileUri, maxPages = 20 } = req.body;

    if (!fileUri) {
      return res.status(400).json({ error: 'fileUri is required' });
    }

    // Validate file exists in S3
    try {
      await s3.headObject(fileUri);
    } catch (error) {
      return res.status(404).json({ error: 'File not found in S3' });
    }

    logger.info({ fileUri }, 'Processing PDF');

    // Extract first pages from PDF
    logger.info({ maxPages }, 'Extracting first pages...');
    const pdfContent = await extractPdfPages(fileUri, maxPages);

    if (!pdfContent.trim()) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    // Call LLM to extract summary
    logger.info('Calling LLM to extract table of contents...');
    const llm = new LLMService();
    const prompt = buildPdfSummaryPrompt(pdfContent);
    const result = await llm.run<PDFResponse>(prompt, pdfContent, true);

    if (!result.success || !result.data) {
      return res.status(500).json({
        error: 'Failed to extract PDF summary',
        detail: result.error,
      });
    }

    const parsed = result.data;
    if (!parsed.toc_found || !parsed.chapters || parsed.chapters.length === 0) {
      return res.status(400).json({
        error: 'No table of contents found in PDF',
        tocFound: parsed.toc_found,
      });
    }

    logger.info({ chaptersCount: parsed.chapters.length }, 'Found chapters');

    // Reuse the existing book when the same file has already been processed.
    const existingBook = await mongoDb.findOne('books', { fileUri });
    const bookMetadata = existingBook || {
      bookId: uuidv4(),
      fileUri,
      fileName: path.basename(fileUri),
      totalChapters: parsed.chapters.length,
      theme: req.body.theme || 'general',
      userId: req.body.userId || 'system',
      createdAt: new Date().toISOString(),
    };

    if (existingBook) {
      logger.info({ bookId: existingBook.bookId, fileUri }, 'Book already exists, skipping insert');
    } else {
      await mongoDb.insertOne('books', bookMetadata);
      logger.info({ bookId: bookMetadata.bookId, fileUri }, 'Saved PDF metadata to books collection');
    }

    // Create and save all lessons to MongoDB in batch
    const lessonsToInsert: any[] = [];
    const lessonsToProcess: any[] = [];
    const enqueuedJobs: any[] = [];

    // Livro já processado antes? Reaproveita as lições existentes dele e
    // apenas as re-enfileira; não relê os capítulos do PDF.
    const existingLessons = await mongoDb.find<any[]>('lessons', {
      bookId: bookMetadata.bookId,
    });

    if (existingLessons.length > 0) {
      for (const existingLesson of existingLessons) {
        lessonsToProcess.push({
          ...existingLesson,
          status: 'PENDING',
          updatedAt: new Date().toISOString(),
        });
      }
      logger.info(
        { bookId: bookMetadata.bookId, lessonsCount: existingLessons.length },
        'Book already has lessons, queued them for reprocessing'
      );
    } else {
      for (const chapter of parsed.chapters) {
        const lesson = {
          lessonId: uuidv4(),
          lessonHash: generateLessonHash(chapter.title),
          bookId: bookMetadata.bookId,
          title: chapter.title,
          fileUri,
          pages: Array.from(
            { length: chapter.end_page - chapter.start_page + 1 },
            (_, i) => chapter.start_page + i
          ),
          userId: req.body.userId || 'system',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        lessonsToInsert.push(lesson);
        lessonsToProcess.push(lesson);
      }
    }

    // Batch insert to MongoDB
    if (lessonsToInsert.length > 0) {
      await mongoDb.insertMany('lessons', lessonsToInsert);
      logger.info({ lessonsCount: lessonsToInsert.length }, 'Batch inserted lessons to MongoDB');
    } else {
      logger.info({ fileUri }, 'All lessons already exist, skipping lesson insert');
    }

    // Enqueue new and existing lessons for processing
    for (const lesson of lessonsToProcess) {
      const job = await addLessonJob({
        lessonId: lesson.lessonId,
        title: lesson.title,
        userId: lesson.userId,
        content: fileUri,
        metadata: {
          pages: lesson.pages,
        },
      });

      enqueuedJobs.push({
        jobId: job.id,
        lessonId: lesson.lessonId,
        title: lesson.title,
        pages: [lesson.pages[0], lesson.pages[lesson.pages.length - 1]],
      });

      logger.info({ jobId: job.id, lessonTitle: lesson.title }, 'Enqueued lesson job');
    }

    res.status(202).json({
      message: 'PDF processed and lessons enqueued for processing',
      bookId: bookMetadata.bookId,
      chaptersFound: lessonsToProcess.length,
      jobs: enqueuedJobs,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error processing PDF');
    res.status(500).json({
      error: 'Error processing PDF',
      detail: error?.message || String(error),
    });
  }
});

export default router;
