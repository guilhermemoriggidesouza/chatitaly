import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { STTService } from '../infra/stt';
import logger from '../logger';

const router = express.Router();

// Recebe o áudio (WAV 16kHz mono) no corpo cru e devolve a transcrição.
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
      const text = await new STTService().transcribe(audio);
      res.json({ text });
    } catch (err: any) {
      logger.error({ err: err?.message }, 'Falha na transcrição');
      res.status(502).json({ error: 'transcription_failed' });
    }
  },
);

export default router;
