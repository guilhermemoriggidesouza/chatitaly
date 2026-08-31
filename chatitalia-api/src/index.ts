import 'dotenv/config';
import 'express-async-errors'; // faz erros de handlers async irem para o errorHandler
import express, { Request, Response } from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import logger from './logger';
import { requireAuth, requireSelf } from './middleware/auth';
import { notFoundHandler, errorHandler, installProcessGuards } from './middleware/error';
import { buildGraph } from './graphs/build-graph';
import { LLMService } from './infra/llm';
import uploadRoutes from './routes/upload';
import pdfRoutes from './routes/pdf';
import userRoutes from './routes/user';
import bookRoutes from './routes/book';
import { mongoDb } from './infra/mongodb';
import { registerWorker } from './queue/workers/lesson-processor';
import { lessonQueue } from './queue/queue';

installProcessGuards();

const app = express();
// Atrás do nginx: confia no X-Forwarded-Proto/-For para req.protocol, req.ip e req.secure.
app.set('trust proxy', 1);
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.use(cors());
// Guarda o corpo cru (Buffer) para a verificação de assinatura do webhook do Clerk.
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  },
}));

// Liveness/health check (sem auth): usado pelo deploy.sh e por proxies.
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Lê a sessão Clerk (cookie/Bearer) e anexa `req.auth`. Não bloqueia nada
// sozinho — o bloqueio é feito por `requireAuth()` nas rotas protegidas.
app.use(clerkMiddleware());

app.use('/upload', uploadRoutes);
app.use('/pdf', pdfRoutes);
app.use('/books', bookRoutes);
// Webhook do Clerk (não passa por sessão de usuário).
app.use('/clerk/user', userRoutes);
app.use('/user', userRoutes);

app.post('/chat', requireAuth(), requireSelf('userId', 'body'), async (req: Request, res: Response) => {
  try {
    const userId = String(req.body.userId ?? '');
    const [user] = await mongoDb.find<any[]>('users', { userId });
    const level = user?.level || req.body.level || 'A1';

    const chatState = {
      messages: req.body.history,
      input: req.body.newMessage,
      current: {
        userId,
        lessonId: req.body.lessonId,
        lesson: req.body.lesson,
        themeId: req.body.themeId,
        theme: req.body.theme,
        level,
      }
    };

    const llm = new LLMService();
    const graph = buildGraph(llm, mongoDb);

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

// Rotas não encontradas -> 404 JSON.
app.use(notFoundHandler);
// Handler de erro global -> SEMPRE por último. Converte qualquer erro de
// rota (inclusive async, via 'express-async-errors') em resposta HTTP,
// em vez de derrubar o processo.
app.use(errorHandler);

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

