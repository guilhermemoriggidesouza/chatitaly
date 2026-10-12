import express, { Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import logger from '../logger';
import { mongoDb } from '../infra/mongodb';
import { WhatsConfig, WhatsSchedule } from '../infra/models/user';
import { requireAuth } from '../middleware/auth';
import { phoneVariants, wahaService } from '../infra/waha';
import { STTService } from '../infra/stt';
import { buildGraph } from '../graphs/build-graph';

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

    // Só o userId no contexto: sem lição/tema o grafo vai error_verify -> answer.
    const response = await buildGraph(mongoDb).invoke({
      messages: [],
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
  });
}

// Responde 200 na hora (o grafo demora e o WAHA reenviaria) e processa depois.
router.post('/webhook', (req: Request, res: Response) => {
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

const HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const SCHEDULE_TYPES: WhatsSchedule['type'][] = ['verbs', 'lesson'];

// Valida os agendamentos vindos da tela: no máximo um por tipo, cada um com
// pelo menos um dia e um horário válido. null/vazio = nada habilitado.
// Devolve `undefined` se o conteúdo for inválido.
function parseConfigs(raw: any): WhatsSchedule[] | null | undefined {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return undefined;

  const configs: WhatsSchedule[] = [];
  for (const item of raw) {
    const type = item?.type;
    const weekDays = Array.isArray(item?.weekDays)
      ? [...new Set<number>(item.weekDays.map(Number))].sort((a, b) => a - b)
      : [];
    const hour = String(item?.hour ?? '');

    if (!SCHEDULE_TYPES.includes(type) || configs.some((config) => config.type === type)) return undefined;
    if (!weekDays.length || weekDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return undefined;
    if (!HOUR_PATTERN.test(hour)) return undefined;

    configs.push({ type, weekDays, hour });
  }

  return configs.length ? configs : null;
}

// Configuração do WhatsApp do assinante (tela /whatsapp do site). GET devolve
// `whatsConfig: null` enquanto ele não configurou nada.
router.get('/config', requireAuth(), async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  const user = await mongoDb.findOne('users', { userId });
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  if (!user.premium) {
    res.status(403).json({ error: 'premium required' });
    return;
  }

  res.json({ whatsConfig: user.whatsConfig ?? null });
});

router.put('/config', requireAuth(), async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  const user = await mongoDb.findOne('users', { userId });
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  if (!user.premium) {
    res.status(403).json({ error: 'premium required' });
    return;
  }

  // Só dígitos; número brasileiro digitado sem DDI (DDD + número) ganha o 55.
  const digits = String(req.body?.phone ?? '').replace(/\D/g, '').replace(/^0+/, '');
  const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (phone.length < 12 || phone.length > 15) {
    res.status(400).json({ error: 'invalid phone' });
    return;
  }

  const configs = parseConfigs(req.body?.configs);
  if (configs === undefined) {
    res.status(400).json({ error: 'invalid configs' });
    return;
  }

  const owner = await mongoDb.findOne('users', {
    'whatsConfig.phone': { $in: phoneVariants(phone) },
    userId: { $ne: userId },
  });
  if (owner) {
    res.status(409).json({ error: 'phone already in use' });
    return;
  }

  const whatsConfig: WhatsConfig = { phone, configs };
  await mongoDb.updateOne('users', { userId }, { $set: { whatsConfig } });

  res.json({ whatsConfig });
});

export default router;
