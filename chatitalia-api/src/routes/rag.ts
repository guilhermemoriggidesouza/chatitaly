import express, { Request, Response } from 'express';
import logger from '../logger';
import { extractFullPdfText } from '../utils/pdf-text';
import { ragService } from '../services/rag-service';
import { mongoDb } from '../infra/mongodb';

const router = express.Router();

// Ingestão do livro no banco vetorial (Neo4j). Sem auth por enquanto —
// chamada logo depois de processar/salvar o livro (POST /pdf/process).
router.post('/process', async (req: Request, res: Response) => {
  const { fileUri, bookId } = req.body || {};
  if (!fileUri || !bookId) {
    res.status(400).json({ error: 'fileUri and bookId are required' });
    return;
  }

  try {
    const text = await extractFullPdfText(fileUri);
    const result = await ragService.ingest(bookId, text);
    res.status(200).json(result);
  } catch (error: any) {
    logger.error({ error: error.message, bookId, fileUri }, 'RAG ingest falhou');
    res.status(500).json({ error: 'RAG ingest failed', detail: error.message });
  }
});

// Backfill do RAG de lição pras lições já processadas ANTES dessa feature
// existir. Não reprocessa nada pelo LLM — só reaproveita o `lessonContent`
// que já está salvo e indexa no Neo4j (chunking + embedding). Rodar uma vez
// em produção depois do deploy; lições novas já são indexadas sozinhas
// (ver queue/workers/lesson-processor.ts).
router.post('/backfill-lessons', async (_req: Request, res: Response) => {
  try {
    const lessons = await mongoDb.find<any[]>('lessons', { status: 'PROCESSED' });

    let processed = 0;
    const failed: { lessonId: string; error: string }[] = [];

    for (const lesson of lessons) {
      if (!lesson.lessonContent) continue;
      try {
        await ragService.ingest(lesson.lessonId, lesson.lessonContent);
        processed++;
      } catch (error: any) {
        failed.push({ lessonId: lesson.lessonId, error: error.message });
        logger.error({ lessonId: lesson.lessonId, error: error.message }, 'Backfill RAG de lição falhou');
      }
    }

    res.status(200).json({ total: lessons.length, processed, failed });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Backfill de lições falhou');
    res.status(500).json({ error: 'Lesson RAG backfill failed', detail: error.message });
  }
});

export default router;
