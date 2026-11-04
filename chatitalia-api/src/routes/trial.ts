import express, { Request, Response } from 'express';
import logger from '../logger';
import { normalizePhone, wahaService } from '../infra/waha';
import { findTrial, registerTrial, startTrial } from '../services/whatsapp-trial';

// Cadastro do teste de 1 dia do Don no WhatsApp ("Não acredita? Prove").
// Público: quem usa ainda não tem conta.
const router = express.Router();

const LEVEL_PATTERN = /^[ABC][12]$/;

// Cadastra o teste e o Don já chama a pessoa no WhatsApp. O envio (cartão do
// verbo, pergunta gerada pela IA) demora: a resposta sai antes, e ele segue
// em segundo plano. Devolve o link da conversa com o Don, pra ela abrir.
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

  // Antes de cadastrar: o número precisa ter WhatsApp.
  let chatId: string | null;
  try {
    chatId = await wahaService.findChatId(phone);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Teste do WhatsApp: WAHA indisponível');
    res.status(502).json({ error: 'whatsapp unavailable' });
    return;
  }
  if (!chatId) {
    res.status(422).json({ error: 'phone is not on WhatsApp' });
    return;
  }

  const status = await registerTrial(phone, name, level);
  if (status === 'used') {
    res.status(409).json({ error: 'trial already used' });
    return;
  }

  // Cadastrado hoje e o Don ainda não chamou (ou o primeiro envio falhou):
  // chama agora. startTrial não faz nada se o teste já começou.
  const trial = await findTrial(phone);
  if (trial) {
    startTrial(trial, chatId).catch((error: any) => {
      logger.error({ phone, error: error.message }, 'Teste do WhatsApp: o Don não conseguiu chamar a pessoa');
    });
  }

  const botPhone = await wahaService.botPhone().catch(() => null);
  res.json({ status, ...(botPhone ? { whatsappUrl: `https://wa.me/${botPhone}` } : {}) });
});

export default router;
