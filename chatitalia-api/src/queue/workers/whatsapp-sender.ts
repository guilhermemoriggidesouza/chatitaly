import { whatsappQueue } from '../queues/whatsapp';
import { waha as wahaConfig } from '../../config';
import { wahaService } from '../../infra/waha';
import logger from '../../logger';

// Processa a fila `whatsapp`: envia as mensagens que a API enfileirou — pro
// celular do job ou, sem celular, pro admin.
export function registerWhatsAppSender() {
    whatsappQueue.process(1, async (job) => {
        const phone = job.data.phone || wahaConfig.adminPhone;
        if (!phone) throw new Error('WAHA_ADMIN_PHONE não definida');
        const chatId = await wahaService.findChatId(phone);
        if (!chatId) throw new Error('phone is not on WhatsApp');
        await wahaService.sendText(chatId, job.data.text);
        logger.info({ jobId: job.id, toAdmin: !job.data.phone }, 'Mensagem enviada no WhatsApp');
    });

    logger.info('WhatsApp sender registered');
}
