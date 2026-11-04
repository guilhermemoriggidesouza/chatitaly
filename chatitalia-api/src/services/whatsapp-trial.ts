import { whatsSchedule as scheduleConfig } from '../config';
import { BOOK_LEVEL_GROUPS, orderedBooks } from '../data/book-levels';
import { mongoDb } from '../infra/mongodb';
import { WhatsTrial } from '../infra/models/whatsapp-trial';
import { phoneVariants, wahaService } from '../infra/waha';
import logger from '../logger';
import { appendToConversation } from './whatsapp-conversation';
import { buildQuestionMessage, buildVerbsMessage, localNow, MessagePart, sendPart } from './whatsapp-schedule';

// Acesso relâmpago de 1 dia ao Don no WhatsApp, pra quem ainda não tem conta.
// A pessoa cadastra o celular no site e manda a primeira mensagem (o link do
// site abre o WhatsApp com TRIAL_START_TEXT pronto). Quem fala primeiro é
// ela: isso protege o número do Don e garante que o celular é dela.
const COLLECTION = 'whatsapp_trials';
export const TRIAL_TIMEZONE = 'America/Sao_Paulo';
export const TRIAL_START_TEXT = 'Quero provar o Don Italiano 🇮🇹';

const today = () => localNow(TRIAL_TIMEZONE)?.dateKey ?? '';
const salesUrl = () => `${scheduleConfig.appUrl}/don-no-whatsapp`;

// A conversa do teste fica guardada como a do aluno, com este id no lugar do userId.
export const trialUserId = (trial: WhatsTrial) => `trial:${trial.phone}`;

export const isTrialActive = (trial: WhatsTrial) => trial.dateKey === today();

export async function findTrial(phone: string): Promise<WhatsTrial | null> {
  return (await mongoDb.findOne(COLLECTION, { phone: { $in: phoneVariants(phone) } })) as WhatsTrial | null;
}

// Cadastra o teste. 'used' = esse celular já usou o teste em outro dia;
// 'active' = já cadastrado hoje (a pessoa pode abrir o WhatsApp de novo).
export async function registerTrial(phone: string, name: string, level: string): Promise<'created' | 'active' | 'used'> {
  const existing = await findTrial(phone);
  if (existing) return isTrialActive(existing) ? 'active' : 'used';

  const bookIndex = BOOK_LEVEL_GROUPS.findIndex((group) => group.levels.includes(level));
  const book = (await orderedBooks())[bookIndex];

  const trial: WhatsTrial = {
    phone,
    name,
    level,
    ...(book?.bookId ? { bookId: book.bookId } : {}),
    dateKey: today(),
    createdAt: new Date().toISOString(),
  };
  await mongoDb.insertOne(COLLECTION, trial);
  return 'created';
}

const shortPause = () => new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));

// Primeira mensagem da pessoa: boas-vindas, o verbo do dia (o primeiro da
// lista, o mais usado) e a pergunta do dia sobre o primeiro tema do livro do
// nível dela. Devolve false se o teste já tinha começado.
export async function startTrial(trial: WhatsTrial, chatId: string): Promise<boolean> {
  const claim = await mongoDb.updateOne(
    COLLECTION,
    { phone: trial.phone, startedAt: { $exists: false } },
    { $set: { startedAt: new Date().toISOString() } },
  );
  if (claim.modifiedCount === 0) return false;

  const student = { userId: trialUserId(trial), level: trial.level, lessons: [], whatsReadVerbs: [], bookId: trial.bookId };
  const dateKey = today();

  const welcome: MessagePart = {
    text: [
      `Ciao, ${trial.name}! 🇮🇹 Eu sou o *Don Italiano*.`,
      ``,
      `Hoje você tem o dia inteiro para conversar comigo aqui. Vou te mandar o verbo do dia e uma pergunta: responda por texto ou áudio que eu corrijo cada frase.`,
    ].join('\n'),
  };

  const parts: MessagePart[] = [welcome];
  for (const build of [() => buildVerbsMessage(student), () => buildQuestionMessage(student, dateKey)]) {
    try {
      const message = await build();
      if (message) parts.push(...message.parts);
    } catch (error: any) {
      logger.warn({ phone: trial.phone, error: error.message }, 'Teste do WhatsApp: uma das mensagens iniciais falhou');
    }
  }

  // Como no agendador: se a primeira falhar, nada chegou e o teste volta a
  // esperar a próxima mensagem da pessoa. As seguintes, se falharem, ficam no log.
  const [first, ...rest] = parts;
  try {
    await sendPart(chatId, first);
  } catch (error) {
    await mongoDb.updateOne(COLLECTION, { phone: trial.phone }, { $unset: { startedAt: '' } });
    throw error;
  }
  for (const part of rest) {
    await shortPause();
    await sendPart(chatId, part).catch((error: any) => {
      logger.warn({ phone: trial.phone, error: error.message }, 'Teste do WhatsApp: uma das mensagens iniciais falhou');
    });
  }

  await appendToConversation(trialUserId(trial), dateKey, [
    { role: 'assistant', content: parts.map((part) => part.text).join('\n\n') },
  ]);
  logger.info({ phone: trial.phone }, 'Teste do WhatsApp começou');
  return true;
}

// Depois do dia do teste: um aviso só, com o link pra assinar. Depois disso
// o Don não responde mais esse número.
export async function notifyTrialEnded(trial: WhatsTrial, chatId: string): Promise<void> {
  const claim = await mongoDb.updateOne(
    COLLECTION,
    { phone: trial.phone, endedNoticeAt: { $exists: false } },
    { $set: { endedNoticeAt: new Date().toISOString() } },
  );
  if (claim.modifiedCount === 0) return;

  await wahaService.sendText(chatId, [
    `Seu dia com o Don Italiano terminou. 🇮🇹`,
    ``,
    `Gostou? Assine e continue praticando todo dia, com 14 dias grátis: ${salesUrl()}`,
  ].join('\n'));
}

// Número sem conta e sem teste que pediu pra provar: manda o link do cadastro.
export async function sendTrialSignupLink(chatId: string): Promise<void> {
  await wahaService.sendText(chatId, [
    `Ciao! 🇮🇹 Para provar o Don Italiano por 1 dia, cadastre este número aqui:`,
    salesUrl(),
  ].join('\n'));
}
