import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { STTService } from '../infra/stt';
import { fixTranscript } from '../services/transcript-fixer';
import logger from '../logger';

const router = express.Router();

// Recebe o áudio (WAV 16kHz mono) no corpo cru e devolve a transcrição já
// revisada. `?context=` = última fala do Don (ajuda a revisão a acertar).
// `express.json` global ignora audio/*, então o stream chega intacto aqui.
router.post(
  '/',
  requireAuth(),
  express.raw({ type: () => true, limit: '25mb' }),
  async (req: Request, res: Response) => {
    const audio = req.body as Buffer;
    if (!audio || !audio.length) {
      res.status(400).json({ error: 'áudio vazio' });
      return;
    }

    try {
      const raw = await new STTService().transcribe(audio);
      const context = String(req.query.context ?? '').slice(0, 600);
      const text = await fixTranscript(raw, context || undefined);
      res.json({ text });
    } catch (err: any) {
      logger.error({ err: err?.message }, 'Falha na transcrição');
      res.status(502).json({ error: 'transcription_failed' });
    }
  },
);

export default router;
