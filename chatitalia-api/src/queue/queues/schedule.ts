import Queue from 'bull';
import logger from '../../logger';

// Fila do agendador de verbos/lições no WhatsApp. Tem um único job, repetido
// a cada minuto (ver workers/whatsapp-schedule.ts), que pergunta ao banco
// quem está na hora. Os dias/horários de cada aluno ficam em
// `users.whatsConfig` — mudar o agendamento é só salvar o usuário.
export const whatsappScheduleQueue = new Queue('whatsapp-schedule', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    settings: {
        // Um tick com vários alunos (LLM + envios + pausas) passa de 30s.
        lockDuration: 300000,
    },
});

whatsappScheduleQueue.on('error', (error) => {
    logger.error({ error }, 'WhatsApp schedule queue error');
});

whatsappScheduleQueue.on('failed', (job, error) => {
    logger.error({ jobId: job.id, error: error.message }, 'WhatsApp schedule tick failed');
});
