import express, { Request, Response } from 'express';
import logger from '../logger';
import { normalizePhone, wahaService } from '../infra/waha';
import { registerTrial, TRIAL_START_TEXT } from '../services/whatsapp-trial';

// Cadastro do teste de 1 dia do Don no WhatsApp ("Não acredita? Prove").
// Público: quem usa ainda não tem conta.
const router = express.Router();

const LEVEL_PATTERN = /^[ABC][12]$/;

// Devolve o link do WhatsApp do Don com a mensagem que começa o teste: quem
// manda a primeira mensagem é a pessoa, do celular que ela cadastrou.
router.post('/', async (req: Request, res: Response) => {
  const phone = normalizePhone(req.body?.phone);
  const name = String(req.body?.name ?? '').trim().split(/\s+/)[0]?.slice(0, 40) ?? '';
  const rawLevel = String(req.body?.level ?? '').toUpperCase();
  const level = LEVEL_PATTERN.test(rawLevel) ? rawLevel : 'A1';

  if (!phone) {
    res.status(400).json({ error: 'invalid phone' });
    return;
  }
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (req.body?.consent !== true) {
    res.status(400).json({ error: 'consent is required' });
    return;
  }

  const status = await registerTrial(phone, name, level);
  if (status === 'used') {
    res.status(409).json({ error: 'trial already used' });
    return;
  }

  let botPhone: string | null = null;
  try {
    botPhone = await wahaService.botPhone();
  } catch (error: any) {
    logger.error({ error: error.message }, 'Teste do WhatsApp: não deu pra ler o número do Don no WAHA');
  }
  if (!botPhone) {
    res.status(502).json({ error: 'whatsapp unavailable' });
    return;
  }

  res.json({
    status,
    whatsappUrl: `https://wa.me/${botPhone}?text=${encodeURIComponent(TRIAL_START_TEXT)}`,
  });
});

export default router;
