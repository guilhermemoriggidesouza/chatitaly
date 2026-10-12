import { createHmac, timingSafeEqual } from 'node:crypto';
import express, { Request, Response } from 'express';
import logger from '../logger';
import { waha as wahaConfig } from '../config';
import { mongoDb } from '../infra/mongodb';
import { phoneVariants, wahaService } from '../infra/waha';
import { STTService } from '../infra/stt';
import { buildGraph } from '../graphs/build-graph';
import { appendToConversation, getConversationHistory } from '../services/whatsapp-conversation';
import { localNow } from '../services/whatsapp-schedule';

// Webhook do WAHA: mensagens recebidas no WhatsApp -> o Don Italiano responde.
// Sem auth: quem chama é o container do WAHA, não um usuário logado.
const router = express.Router();

// Envio de teste: número e texto fixos por enquanto.
const TEST_PHONE = '5519989375173';
const TEST_MESSAGE = 'teste';

// O que o aluno disse: o texto da mensagem ou, se for áudio, a transcrição.
async function messageText(message: any): Promise<string> {
  const text = String(message.body ?? '').trim();
  if (text) return text;

  const mimetype = String(message.media?.mimetype ?? '');
  if (!message.hasMedia || !message.media?.url || !mimetype.startsWith('audio/')) return '';

  const audio = await wahaService.downloadMedia(message.media.url);
  return new STTService().transcribe(audio, mimetype);
}

async function handleIncomingMessage(event: any) {
  const message = event?.payload;
  if (event?.event !== 'message' || !message || message.fromMe) return;

  const phone = await wahaService.phoneFromChatId(String(message.from ?? ''));
  if (!phone) return;

  const user = await mongoDb.findOne('users', { 'whatsConfig.phone': { $in: phoneVariants(phone) } });
  if (!user) {
    logger.info({ phone }, 'WhatsApp: nenhum usuário com esse celular');
    return;
  }

  // "digitando..." aparece pro aluno do começo até a resposta sair.
  await wahaService.withTyping(message.from, async () => {
    // Depois de achar o usuário: não gasta transcrição com número desconhecido.
    const text = await messageText(message);
    if (!text) return;

    // A conversa de HOJE (mensagens agendadas, o que o aluno disse e o que o
    // Don respondeu) entra como histórico. Os outros dias ficam só guardados.
    const dateKey = localNow(user.whatsConfig?.timezone || 'America/Sao_Paulo')?.dateKey ?? '';
    const history = await getConversationHistory(user.userId, dateKey);

    // Só o userId no contexto: sem lição/tema o grafo vai error_verify -> answer.
    const response = await buildGraph(mongoDb).invoke({
      messages: history,
      input: text,
      current: { userId: user.userId },
    });

    const fr = response?.finalResponse;
    const reply = [fr?.response, fr?.question].filter(Boolean).join(' ').trim();
    if (!reply) {
      logger.warn({ userId: user.userId }, 'WhatsApp: grafo não devolveu resposta');
      return;
    }

    const audio = await wahaService.sendTextAndVoice(message.from, reply);
    logger.info({ userId: user.userId, audio }, 'WhatsApp: resposta do Don enviada');

    // Guarda a troca na conversa do dia.
    await appendToConversation(user.userId, dateKey, [
      { role: 'user', content: text },
      { role: 'assistant', content: reply },
    ]);
  });
}

if (!wahaConfig.webhookHmacKey) {
  logger.warn('WAHA_WEBHOOK_HMAC_KEY não definida: o webhook do WhatsApp aceita chamadas sem assinatura');
}

// O WAHA assina cada chamada: manda no header X-Webhook-Hmac o HMAC-SHA512
// (em hex) do corpo cru, feito com a chave combinada. Só quem tem a chave
// consegue gerar a mesma assinatura — é o que prova que a chamada veio do
// WAHA e que o corpo não foi alterado. Sem chave configurada (dev), não confere.
function hasValidSignature(req: Request): boolean {
  if (!wahaConfig.webhookHmacKey) return true;

  const rawBody: Buffer = (req as any).rawBody ?? Buffer.alloc(0);
  const expected = Buffer.from(createHmac('sha512', wahaConfig.webhookHmacKey).update(rawBody).digest('hex'));
  const received = Buffer.from(String(req.header('x-webhook-hmac') ?? '').toLowerCase());
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Responde 200 na hora (o grafo demora e o WAHA reenviaria) e processa depois.
router.post('/webhook', (req: Request, res: Response) => {
  if (!hasValidSignature(req)) {
    logger.warn({ ip: req.ip }, 'WhatsApp: webhook com assinatura inválida recusado');
    res.status(401).json({ error: 'invalid signature' });
    return;
  }

  res.status(200).json({ received: true });
  handleIncomingMessage(req.body).catch((error: any) => {
    logger.error({ error: error.message }, 'WhatsApp: falha ao tratar mensagem recebida');
  });
});

router.post('/send', async (_req: Request, res: Response) => {
  try {
    const chatId = await wahaService.findChatId(TEST_PHONE);
    if (!chatId) {
      res.status(404).json({ error: 'phone is not on WhatsApp', phone: TEST_PHONE });
      return;
    }

    const audio = await wahaService.sendTextAndVoice(chatId, TEST_MESSAGE);

    res.status(200).json({ sent: true, chatId, text: TEST_MESSAGE, audio });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Envio de mensagem pelo WAHA falhou');
    res.status(502).json({ error: 'could not send WhatsApp message', detail: error.message });
  }
});

export default router;
