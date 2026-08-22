import express, { Request, Response } from 'express';
import cors from 'cors';
import logger from './logger';
import { buildGraph } from './graphs/build-graph';
import { LLMService } from './infra/llm';
import { getMCPTools } from './tools';
import uploadRoutes from './routes/upload';
import pdfRoutes from './routes/pdf';
import userRoutes from './routes/user';
import { mongoDb } from './infra/mongodb';
import { registerWorker } from './queue/workers/lesson-processor';
import { lessonQueue } from './queue/queue';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.use(cors());
app.use(express.json());

app.use('/upload', uploadRoutes);
app.use('/pdf', pdfRoutes);
app.use('/clerk/user', userRoutes);
app.use('/user', userRoutes);

app.post('/chat', async (req: Request, res: Response) => {
  try {
    const chatState = {
      messages: req.body.history,
      input: req.body.newMessage,
      current: {
        userId: String(req.body.userId ?? ''),
        lessonId: req.body.lessonId,
        themeId: req.body.themeId,
        theme: req.body.theme,
      }
    };

    const llm = new LLMService();
    const tools = await getMCPTools();
    const graph = buildGraph(llm, tools);

    logger.info({
      ...chatState,
    }, 'Initial state')

    const response = await graph.invoke(chatState);

    res.json(response);
  } catch (err: any) {
    logger.error(err, 'Error handling /chat');
    res.status(500).json({ error: err?.message || String(err) });
  }
});

(async () => {
  try {
    await mongoDb.connect();
    await registerWorker();

    const server = app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server listening');
    });

    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');

      server.close(async () => {
        try {
          await lessonQueue.close();
          logger.info('Queue closed');

          await mongoDb.disconnect();
          logger.info('Disconnected from MongoDB');

          process.exit(0);
        } catch (error: any) {
          logger.error({ error }, 'Error during shutdown');
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error: any) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
})();

