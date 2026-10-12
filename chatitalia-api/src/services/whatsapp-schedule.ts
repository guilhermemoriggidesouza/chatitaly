import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config as llmConfig, whatsSchedule as scheduleConfig } from '../config';
import { LLMService } from '../infra/llm';
import { mongoDb } from '../infra/mongodb';
import { captureElement } from '../infra/screenshot';
import { User, WhatsSchedule } from '../infra/models/user';
import { wahaService } from '../infra/waha';
import logger from '../logger';
import { buildVerbExampleSystemPrompt, VerbExampleSchema, VerbExampleType } from '../prompts/verb-example';
import { appendToConversation } from './whatsapp-conversation';
import { buildDailyQuestionSystemPrompt, DailyQuestionSchema, DailyQuestionType } from '../prompts/daily-question';

const HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 24 * 60 * 60 * 1000;

// "Agora" no fuso do aluno: dia da semana, minutos desde 00:00 e a data local.
// Null se o fuso for inválido.
export function localNow(timezone: string, date: Date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

    return {
      weekday: WEEKDAYS.indexOf(get('weekday')),
      minutes: Number(get('hour')) * 60 + Number(get('minute')),
      dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    };
  } catch {
    return null;
  }
}

// Está na hora desse envio? Dia marcado, horário já chegou (com tolerância de
// atraso pra quando o worker ficou fora) e ainda não foi enviado hoje.
export function isDue(
  config: WhatsSchedule,
  timezone: string,
  lastSentDate: string | undefined,
  date: Date = new Date(),
): boolean {
  if (!HOUR_PATTERN.test(config.hour || '')) return false;

  const now = localNow(timezone, date);
  if (!now) return false;
  if (!config.weekDays?.includes(now.weekday)) return false;
  if (lastSentDate === now.dateKey) return false;

  const [hour, minute] = config.hour.split(':').map(Number);
  const late = now.minutes - (hour * 60 + minute);
  return late >= 0 && late <= scheduleConfig.catchUpMinutes;
}

// O que o agendador envia: texto e, quando houver, uma imagem (o texto vira
// a legenda). `verb` vem preenchido no verbo do dia, pra marcar no aluno
// qual foi o último que ele viu.
export type ScheduledMessage = { text: string; imageBase64?: string; verb?: string };

// Próximo verbo do aluno: a lista de verbos regulares em ordem alfabética,
// continuando de onde ele parou (`lastVerb`). Chegando no fim, volta ao
// começo. Sem sorteio: cada aluno vê todos, um por envio, sem repetir.
export async function pickNextVerb(lastVerb?: string): Promise<any | null> {
  const verbs = (await mongoDb.find<any[]>('verbs', {}))
    .sort((a, b) => String(a.infinitive ?? '').localeCompare(String(b.infinitive ?? ''), 'it'));
  if (!verbs.length) return null;

  const lastIndex = verbs.findIndex((verb) => verb.infinitive === lastVerb);
  return verbs[(lastIndex + 1) % verbs.length];
}

// Frase de exemplo do verbo: gerada pelo modelo uma vez e salva no verbo.
async function getVerbExample(verb: any): Promise<{ italian: string; portuguese: string }> {
  if (verb.example?.italian) return verb.example;

  const response = await new LLMService(llmConfig.responseModel).generatedStructure<VerbExampleType>(
    buildVerbExampleSystemPrompt(verb.infinitive, verb.translation),
    'Write the example sentence.',
    VerbExampleSchema,
  );
  if (!response.success || !response.data) {
    throw new Error(`Failed to generate verb example: ${response.error}`);
  }

  await mongoDb.updateOne('verbs', { verbId: verb.verbId }, { $set: { example: response.data } });
  return response.data;
}

// Print do cartão do verbo (página /verbs/card do site). O Chromium é pesado,
// então a imagem fica guardada em uploads/verb-cards e só é refeita se o
// arquivo for apagado.
async function getVerbCardImage(infinitive: string): Promise<string> {
  const directory = path.join(process.cwd(), 'uploads', 'verb-cards');
  const file = path.join(directory, `${infinitive}.png`);
  if (existsSync(file)) return (await readFile(file)).toString('base64');

  const url = `${scheduleConfig.appUrl}/verbs/card?verb=${encodeURIComponent(infinitive)}`;
  const image = await captureElement(url, '.verb-card');
  await mkdir(directory, { recursive: true });
  await writeFile(file, image);
  logger.info({ infinitive, bytes: image.length }, 'Print do cartão do verbo gerado');

  return image.toString('base64');
}

// Mensagem do verbo do dia: o print do cartão com, na legenda, uma frase de
// exemplo e o pedido pra praticar. Se o print falhar, vai só o texto com o
// link do cartão.
export async function buildVerbsMessage(user: User): Promise<ScheduledMessage | null> {
  const verb = await pickNextVerb(user.whatsLastVerb);
  if (!verb) return null;

  const infinitive = String(verb.infinitive);
  const example = await getVerbExample(verb);
  const text = [
    `🇮🇹 *Verbo del giorno: ${infinitive}* (${verb.translation})`,
    ``,
    `_${example.italian}_`,
    example.portuguese,
    ``,
    `Agora é a sua vez: escreva frases com *${infinitive}* que o Don corrige.`,
  ].join('\n');

  try {
    return { text, verb: infinitive, imageBase64: await getVerbCardImage(infinitive) };
  } catch (error: any) {
    logger.warn({ infinitive, error: error.message }, 'Print do cartão falhou; enviando só o texto');
    const link = `${scheduleConfig.appUrl}/verbs/card?verb=${encodeURIComponent(infinitive)}`;
    return { text: `${text}\n\nConjugação completa: ${link}`, verb: infinitive };
  }
}

// Tema atual do aluno: na primeira lição (na ordem do livro) que ele ainda
// não concluiu, o primeiro tema que ele ainda não terminou.
export async function findCurrentTheme(user: User & { bookId?: string }) {
  const bookLessons = (await mongoDb.find<any[]>('lessons', { bookId: user.bookId }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const userLessons = new Map((user.lessons ?? []).map((lesson) => [lesson.lessonId, lesson]));

  for (const lesson of bookLessons) {
    const userLesson = userLessons.get(lesson.lessonId);
    if (userLesson?.finalConsiderations) continue;

    const doneThemeIds = userLesson?.themeIds ?? [];
    const themes = await mongoDb.find<any[]>('themes', { lessonId: lesson.lessonId });
    const theme = themes.find((item) => item.theme && !doneThemeIds.includes(item.themeId));
    if (theme) {
      return { lessonId: lesson.lessonId as string, lesson: lesson.title as string, themeId: theme.themeId as string, theme: theme.theme as string };
    }
  }

  return null;
}

// Pergunta do dia: o Don pergunta algo sobre o tema atual do aluno, pra ele
// responder (texto ou áudio) e ser corrigido. Nada é salvo: nem a pergunta,
// nem a resposta. Pra não repetir enquanto o aluno está no mesmo tema, o
// ângulo da pergunta muda conforme o dia.
export async function buildQuestionMessage(
  user: User & { bookId?: string },
  dateKey: string,
): Promise<ScheduledMessage | null> {
  const current = await findCurrentTheme(user);
  if (!current) return null;

  const dayNumber = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS);
  const response = await new LLMService(llmConfig.responseModel).generatedStructure<DailyQuestionType>(
    buildDailyQuestionSystemPrompt(user.level, current.theme, current.lesson, dayNumber),
    'Write the question of the day.',
    DailyQuestionSchema,
  );
  const question = response.data?.question?.trim();
  if (!response.success || !question) {
    throw new Error(`Failed to generate daily question: ${response.error}`);
  }

  const text = [
    `🇮🇹 *Domanda del giorno*`,
    `_${current.theme}_`,
    ``,
    question,
    ``,
    `Responda por texto ou áudio que o Don corrige.`,
  ].join('\n');

  return { text };
}

const randomPause = () =>
  new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 2500));

// Roda a cada minuto no worker: acha quem está na hora e envia. Um aluno com
// erro não impede os outros.
export async function runScheduleTick(date: Date = new Date()): Promise<{ sent: number; failed: number }> {
  const users = await mongoDb.find<any[]>('users', {
    premium: true,
    'whatsConfig.configs.0': { $exists: true },
  });

  let sent = 0;
  let failed = 0;
  for (const user of users) {
    const { phone, timezone, configs } = user.whatsConfig;

    for (const config of configs as WhatsSchedule[]) {
      if (!isDue(config, timezone, user.whatsLastSent?.[config.type], date)) continue;

      const { dateKey } = localNow(timezone, date)!;
      const lastSentField = `whatsLastSent.${config.type}`;

      // Marca ANTES de enviar e só segue se foi este tick que marcou — garante
      // um envio por dia mesmo com dois ticks/workers concorrentes.
      const claim = await mongoDb.updateOne(
        'users',
        { userId: user.userId, [lastSentField]: { $ne: dateKey } },
        { $set: { [lastSentField]: dateKey } },
      );
      if (claim.modifiedCount === 0) continue;

      try {
        const message: ScheduledMessage | null = config.type === 'verbs'
          ? await buildVerbsMessage(user)
          : await buildQuestionMessage(user, dateKey);
        if (!message) {
          logger.info({ userId: user.userId, type: config.type }, 'WhatsApp agendado: nada pra enviar');
          continue;
        }

        const chatId = await wahaService.findChatId(phone);
        if (!chatId) throw new Error('phone is not on WhatsApp');

        if (message.imageBase64) {
          await wahaService.sendImage(chatId, message.imageBase64, message.text);
        } else {
          await wahaService.sendText(chatId, message.text);
        }
        // Só depois de enviado: marca o verbo como visto, pro próximo ser outro.
        if (message.verb) {
          await mongoDb.updateOne('users', { userId: user.userId }, { $set: { whatsLastVerb: message.verb } });
        }
        // Guarda na conversa do dia, pro Don saber ao que o aluno está respondendo.
        await appendToConversation(user.userId, dateKey, [{ role: 'assistant', content: message.text }]);

        sent++;
        logger.info({ userId: user.userId, type: config.type }, 'WhatsApp agendado enviado');
      } catch (error: any) {
        failed++;
        // Desfaz a marca pra tentar de novo no próximo minuto (dentro da tolerância).
        await mongoDb.updateOne(
          'users',
          { userId: user.userId, [lastSentField]: dateKey },
          { $unset: { [lastSentField]: '' } },
        );
        logger.error({ userId: user.userId, type: config.type, error: error.message }, 'Falha no WhatsApp agendado');
      }

      // Pausa aleatória entre envios: rajada de mensagens é padrão de spam.
      await randomPause();
    }
  }

  return { sent, failed };
}
