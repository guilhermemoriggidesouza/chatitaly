import express, { Request, Response } from 'express';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist';
import { LLMService } from '../infra/llm';
import { mongoDb } from '../infra/mongodb';
import { s3 } from '../infra/s3';
import { v4 as uuidv4 } from 'uuid';
import { buildPdfSummaryPrompt } from '../prompts/pdf-summary-agent';

const router = express.Router();

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFLesson {
  fileUri: string;
  title: string;
  lessonId: string;
  pages: [number, number]; // [start, end]
  status: 'PROCESSED' | 'ON_PROCESS' | 'ERROR_PROCESSING';
  createdAt: string;
  error?: string;
}

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
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;

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
    console.error('[PDF] Error extracting pages:', error.message);
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

    console.log(`[PDF Route] Processing PDF: ${fileUri}`);

    // Extract first pages from PDF
    console.log(`[PDF Route] Extracting first ${maxPages} pages...`);
    const pdfContent = await extractPdfPages(fileUri, maxPages);

    if (!pdfContent.trim()) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    // Call LLM to extract summary
    console.log('[PDF Route] Calling LLM to extract table of contents...');
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

    console.log(`[PDF Route] Found ${parsed.chapters.length} chapters`);

    // Create lessons from chapters
    const lessons: PDFLesson[] = [];
    for (const chapter of parsed.chapters) {
      const lesson: PDFLesson = {
        fileUri,
        title: chapter.title,
        lessonId: uuidv4(),
        pages: [chapter.start_page, chapter.end_page],
        status: 'PROCESSED',
        createdAt: new Date().toISOString(),
      };

      // Save to MongoDB
      await mongoDb.insertOne('lessons', lesson);
      lessons.push(lesson);

      console.log(`[PDF Route] Created lesson: ${chapter.title} (pages ${chapter.start_page}-${chapter.end_page})`);
    }

    res.status(201).json({
      message: 'PDF processed successfully',
      chaptersFound: parsed.chapters.length,
      lessons,
    });
  } catch (error: any) {
    console.error('[PDF Route] Error:', error.message);
    res.status(500).json({
      error: 'Error processing PDF',
      detail: error?.message || String(error),
    });
  }
});

export default router;
