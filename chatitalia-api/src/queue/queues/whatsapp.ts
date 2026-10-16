import Queue from 'bull';
import logger from '../../logger';

// Mensagens avulsas no WhatsApp que a API enfileira e o worker envia: avisos
// para o admin e o teste de envio da tela Configurar WhatsApp. O agendador de
// verbos/lições tem fila própria.
export interface WhatsAppJobData {
    text: string;
    // Celular de destino (só dígitos, com DDI). Sem ele, vai pro admin.
    phone?: string;
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

// Teste de envio pedido pelo aluno: uma tentativa só (é um teste, ele pode
// clicar de novo).
export async function addTestMessage(phone: string, text: string) {
    return whatsappQueue.add({ phone, text }, { attempts: 1, removeOnComplete: true, removeOnFail: true });
}

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
