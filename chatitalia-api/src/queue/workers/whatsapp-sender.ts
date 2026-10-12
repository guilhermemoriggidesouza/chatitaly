import { whatsappQueue } from '../queues/whatsapp';
import { waha as wahaConfig } from '../../config';
import { wahaService } from '../../infra/waha';
import logger from '../../logger';

// Processa a fila `whatsapp`: envia ao admin os avisos que a API enfileirou.
export function registerWhatsAppSender() {
    whatsappQueue.process(1, async (job) => {
        const chatId = await wahaService.findChatId(wahaConfig.adminPhone);
        if (!chatId) throw new Error('admin phone is not on WhatsApp');
        await wahaService.sendText(chatId, job.data.text);
        logger.info({ jobId: job.id }, 'Aviso enviado ao admin no WhatsApp');
    });

    logger.info('WhatsApp sender registered');
}
