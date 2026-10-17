import express, { Request, Response } from 'express';
import logger from '../logger';
import { requireAuth, requireSelf } from '../middleware/auth';
import { buildGraph } from '../graphs/build-graph';
import { mongoDb } from '../infra/mongodb';
import { TTSService } from '../infra/tts';

const router = express.Router();

router.post('/', requireAuth(), requireSelf('userId', 'body'), async (req: Request, res: Response) => {
  try {
    const userId = String(req.body.userId ?? '');
    const [user] = await mongoDb.find<any[]>('users', { userId });
    const level = user?.level || req.body.level || 'A1';
    const bookId = user?.bookId || req.body.bookId;

    const chatState = {
      messages: req.body.history,
      input: req.body.newMessage,
      current: {
        userId,
        bookId,
        lessonId: req.body.lessonId,
        lesson: req.body.lesson,
        themeId: req.body.themeId,
        theme: req.body.theme,
        level,
        studentName: user?.name,
      }
    };

    const graph = buildGraph(mongoDb);

    logger.info({
      ...chatState,
    }, 'Initial state')

    const response = await graph.invoke(chatState);

    let donAudio = '';
    try {
      const fr = response?.finalResponse;
      const speechText = [fr?.response, fr?.question].filter(Boolean).join('. ').trim();
      donAudio = await new TTSService().synthesize(speechText);
    } catch {
      /* segue sem áudio */
    }

    res.json(donAudio ? { ...response, donAudio } : response);
  } catch (err: any) {
    logger.error(err, 'Error handling /chat');
    res.status(500).json({ error: err?.message || String(err) });
  }
});

export default router;
