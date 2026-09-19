import 'dotenv/config';
import 'express-async-errors'; // faz erros de handlers async irem para o errorHandler
import express, { Request, Response } from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import logger from './logger';
import { requireAuth, requireSelf } from './middleware/auth';
import { notFoundHandler, errorHandler, installProcessGuards } from './middleware/error';
import { buildGraph } from './graphs/build-graph';
import uploadRoutes from './routes/upload';
import pdfRoutes from './routes/pdf';
import userRoutes from './routes/user';
import bookRoutes from './routes/book';
import transcribeRoutes from './routes/transcribe';
import ragRoutes from './routes/rag';
import { mongoDb } from './infra/mongodb';
import { connectNeo4j, disconnectNeo4j } from './infra/neo4j';
import { registerWorker } from './queue/workers/lesson-processor';
import { lessonQueue } from './queue/queue';
import { TTSService } from './infra/tts';

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
app.use('/transcribe', transcribeRoutes);
app.use('/rag', ragRoutes);
// Webhook do Clerk (não passa por sessão de usuário).
app.use('/clerk/user', userRoutes);
app.use('/user', userRoutes);

app.post('/chat', requireAuth(), requireSelf('userId', 'body'), async (req: Request, res: Response) => {
  try {
    const userId = String(req.body.userId ?? '');
    const [user] = await mongoDb.find<any[]>('users', { userId });
    const level = user?.level || req.body.level || 'A1';
    const bookId = user?.bookId || req.body.bookId;

    // RAG roda dentro de cada node que precisa (plain, answer, conversational)
    // — não mais buscado aqui antecipado.
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
      }
    };

    const graph = buildGraph(mongoDb);

    logger.info({
      ...chatState,
    }, 'Initial state')

    const response = await graph.invoke(chatState);

    // Voz do Don (Piper): campo `donAudio` (data URI) ao lado da resposta,
    // sem tocar no schema do grafo. Fala a resposta + a pergunta de follow-up
    // (o mesmo texto que o front mostra). Se falhar/desligado, segue sem áudio.
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

// Rotas não encontradas -> 404 JSON.
app.use(notFoundHandler);
// Handler de erro global -> SEMPRE por último. Converte qualquer erro de
// rota (inclusive async, via 'express-async-errors') em resposta HTTP,
// em vez de derrubar o processo.
app.use(errorHandler);

(async () => {
  try {
    await mongoDb.connect();

    // Neo4j é só o RAG (feature nova): se estiver fora, o app sobe do mesmo
    // jeito e o RAG degrada em silêncio (ragService.search devolve []).
    try {
      await connectNeo4j();
    } catch (error) {
      logger.warn({ error }, 'Neo4j indisponível no boot — RAG fica desligado até reconectar');
    }

    await registerWorker();

    const server = app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server listening');
    });

    // Valida o binário local de voz do Don (Piper).
    new TTSService().warmUp();

    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');

      server.close(async () => {
        try {
          await lessonQueue.close();
          logger.info('Queue closed');

          await mongoDb.disconnect();
          logger.info('Disconnected from MongoDB');

          await disconnectNeo4j();

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

