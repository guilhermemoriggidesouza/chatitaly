import express, { Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { mongoDb } from '../infra/mongodb';
import { WhatsConfig, WhatsSchedule } from '../infra/models/user';
import { requireAuth } from '../middleware/auth';
import { phoneVariants } from '../infra/waha';

// Configuração do WhatsApp do assinante (Mongo). O webhook do WAHA fica em
// routes/whatsapp-webhook.ts.
const router = express.Router();

const HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const SCHEDULE_TYPES: WhatsSchedule['type'][] = ['verbs', 'lesson'];

// Fuso IANA válido (ex.: America/Sao_Paulo)? Quem decide é o próprio Node.
function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

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

  const timezone = String(req.body?.timezone ?? '');
  if (!timezone || !isValidTimezone(timezone)) {
    res.status(400).json({ error: 'invalid timezone' });
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

  const whatsConfig: WhatsConfig = { phone, timezone, configs };
  await mongoDb.updateOne('users', { userId }, { $set: { whatsConfig } });

  res.json({ whatsConfig });
});

export default router;
