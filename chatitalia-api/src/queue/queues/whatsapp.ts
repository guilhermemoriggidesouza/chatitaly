import Queue from 'bull';
import logger from '../../logger';

// Avisos para o admin no WhatsApp: a API enfileira e o worker envia (só o
// worker fala com o WAHA). O agendador de verbos/lições tem fila própria.
export interface WhatsAppJobData {
    text: string;
}

export const whatsappQueue = new Queue<WhatsAppJobData>('whatsapp', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
});

whatsappQueue.on('error', (error) => {
    logger.error({ error }, 'WhatsApp queue error');
});

whatsappQueue.on('failed', (job, error) => {
    logger.error(
        { jobId: job.id, attempts: job.attemptsMade, error: error.message },
        'WhatsApp job failed'
    );
});

export async function addAdminNotification(text: string) {
    return whatsappQueue.add(
        { text },
        {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
        },
    );
}
