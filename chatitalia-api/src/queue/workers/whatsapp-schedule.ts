import { whatsappScheduleQueue } from '../queues/schedule';
import { runScheduleTick } from '../../services/whatsapp-schedule';
import logger from '../../logger';

// Registra o processador e o job repetido (a cada minuto) do agendador.
export async function registerWhatsAppSchedule() {
    whatsappScheduleQueue.process(1, async () => {
        const result = await runScheduleTick();
        if (result.sent || result.failed) {
            logger.info(result, 'WhatsApp schedule tick');
        }
        return result;
    });

    // Idempotente: o Bull usa a mesma chave pro mesmo cron, então reiniciar o
    // worker não duplica o job.
    await whatsappScheduleQueue.add(
        {},
        { repeat: { cron: '* * * * *' }, removeOnComplete: true, removeOnFail: true },
    );

    logger.info('WhatsApp schedule registered (tick a cada minuto)');
}
