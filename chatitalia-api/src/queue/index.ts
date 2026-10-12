import 'dotenv/config';
import logger from '../logger';
import { installProcessGuards } from '../middleware/error';
import { mongoDb } from '../infra/mongodb';
import { connectNeo4j, disconnectNeo4j } from '../infra/neo4j';
import { lessonQueue } from './queues/lesson';
import { whatsappQueue } from './queues/whatsapp';
import { whatsappScheduleQueue } from './queues/schedule';
import { registerWorker } from './workers/lesson-processor';
import { registerWhatsAppSender } from './workers/whatsapp-sender';
import { registerWhatsAppSchedule } from './workers/whatsapp-schedule';

installProcessGuards();

(async () => {
  try {
    await mongoDb.connect();

    // Neo4j é só o RAG: se estiver fora, o worker sobe do mesmo jeito.
    try {
      await connectNeo4j();
    } catch (error) {
      logger.warn({ error }, 'Neo4j indisponível no boot — RAG fica desligado até reconectar');
    }

    await registerWorker();
    registerWhatsAppSender();
    await registerWhatsAppSchedule();

    logger.info('Worker started');

    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Worker received shutdown signal');
      try {
        await lessonQueue.close();
        await whatsappQueue.close();
        await whatsappScheduleQueue.close();
        await mongoDb.disconnect();
        await disconnectNeo4j();
        process.exit(0);
      } catch (error: any) {
        logger.error({ error }, 'Error during worker shutdown');
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error: any) {
    logger.error({ error }, 'Failed to start worker');
    process.exit(1);
  }
})();
