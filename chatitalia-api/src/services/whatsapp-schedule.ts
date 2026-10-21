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
import { buildVerbExamplesSystemPrompt, VerbExamplesSchema, VerbExamplesType } from '../prompts/verb-examples';
import { TTSService } from '../infra/tts';
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

// Uma mensagem do envio: o texto (vira legenda quando há imagem), a imagem e
// o áudio (WAV em base64, na voz do Don) — os dois últimos opcionais.
export type MessagePart = { text: string; imageBase64?: string; voiceBase64?: string };

// O que o agendador envia: uma ou mais mensagens, em ordem. `readVerbs` vem
// preenchido no verbo do dia: é a lista de verbos já lidos que deve ser
// gravada no aluno depois do envio.
export type ScheduledMessage = { parts: MessagePart[]; readVerbs?: string[] };

// Próximo verbo do aluno: os verbos na ordem do banco (`order`: do mais
// usado para o menos usado), pulando os que ele já leu. Quando ele já leu
// todos, recomeça do primeiro. Devolve também a lista de lidos atualizada.
export async function pickNextVerb(readVerbs: string[] = []): Promise<{ verb: any; readVerbs: string[] } | null> {
  const verbs = (await mongoDb.find<any[]>('verbs', {})).sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      String(a.infinitive ?? '').localeCompare(String(b.infinitive ?? ''), 'it'),
  );
  if (!verbs.length) return null;

  const unread = verbs.find((verb) => !readVerbs.includes(verb.infinitive));
  if (unread) return { verb: unread, readVerbs: [...readVerbs, unread.infinitive] };

  // Já leu todos: nova volta, a partir do mais usado.
  return { verb: verbs[0], readVerbs: [verbs[0].infinitive] };
}

// Os tempos do cartão do verbo, na ordem em que os exemplos aparecem.
const VERB_TENSES: { key: keyof VerbExamplesType; label: string }[] = [
  { key: 'presente', label: 'Presente' },
  { key: 'passatoProssimo', label: 'Pretérito perfeito' },
  { key: 'imperfetto', label: 'Pretérito imperfeito' },
  { key: 'futuro', label: 'Futuro simples' },
  { key: 'condizionale', label: 'Pedir' },
  { key: 'imperativo', label: 'Instrução' },
];

// Frases de exemplo do verbo, uma por tempo, geradas numa chamada só ao
// modelo e salvas no verbo (o mesmo verbo serve pra todos os alunos).
async function getVerbExamples(verb: any): Promise<VerbExamplesType> {
  if (VERB_TENSES.every(({ key }) => verb.examples?.[key]?.italian)) return verb.examples;

  const response = await new LLMService(llmConfig.responseModel).generatedStructure<VerbExamplesType>(
    buildVerbExamplesSystemPrompt(verb.infinitive, verb.translation, verb.auxiliary),
    'Write the example sentences.',
    VerbExamplesSchema,
  );
  if (!response.success || !response.data) {
    throw new Error(`Failed to generate verb examples: ${response.error}`);
  }

  await mongoDb.updateOne('verbs', { verbId: verb.verbId }, { $set: { examples: response.data } });
  return response.data;
}

// Áudio do Don lendo as frases de exemplo do verbo, todas num áudio só.
// Fica guardado em uploads/verb-audio (o verbo e as frases são os mesmos pra
// todos). Sem Piper, devolve undefined e vai só o texto.
async function getVerbAudio(infinitive: string, italianSentences: string[]): Promise<string | undefined> {
  const directory = path.join(process.cwd(), 'uploads', 'verb-audio');
  const file = path.join(directory, `${infinitive}.wav`);
  if (existsSync(file)) return (await readFile(file)).toString('base64');

  const dataUri = await new TTSService().synthesize(italianSentences.join(' '));
  const wavBase64 = dataUri.split(',')[1];
  if (!wavBase64) return undefined;

  await mkdir(directory, { recursive: true });
  await writeFile(file, Buffer.from(wavBase64, 'base64'));
  return wavBase64;
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

// Legenda do WhatsApp tem limite (~1024 caracteres): acima disso, o texto
// vai numa mensagem separada.
const CAPTION_LIMIT = 1000;

// Verbo do dia numa mensagem só: o print do cartão com, na legenda, uma frase
// de exemplo por tempo e o pedido pra praticar — e o áudio do Don lendo as
// frases (o WhatsApp não junta áudio e imagem na mesma mensagem). Se o print
// falhar, o texto vai sozinho com o link do cartão.
export async function buildVerbsMessage(user: User): Promise<ScheduledMessage | null> {
  const next = await pickNextVerb(user.whatsReadVerbs);
  if (!next) return null;
  const { verb, readVerbs } = next;

  const infinitive = String(verb.infinitive);
  const examples = await getVerbExamples(verb);
  const link = `${scheduleConfig.appUrl}/verbs/card?verb=${encodeURIComponent(infinitive)}`;

  const text = [
    `🇮🇹 *Verbo del giorno: ${infinitive}* (${verb.translation})`,
    ``,
    ...VERB_TENSES.map(({ key, label }) => `*${label}:* ${examples[key].italian}\n_${examples[key].portuguese}_`),
    ``,
    `Agora é a sua vez: escreva frases com *${infinitive}* que o Don corrige.`,
  ].join('\n');

  const voiceBase64 = await getVerbAudio(
    infinitive,
    VERB_TENSES.map(({ key }) => examples[key].italian),
  ).catch(() => undefined);

  let imageBase64: string | undefined;
  try {
    imageBase64 = await getVerbCardImage(infinitive);
  } catch (error: any) {
    logger.warn({ infinitive, error: error.message }, 'Print do cartão falhou; enviando só o texto');
  }

  if (!imageBase64) return { parts: [{ text: `${text}\n\nConjugação completa: ${link}`, voiceBase64 }], readVerbs };
  if (text.length <= CAPTION_LIMIT) return { parts: [{ text, imageBase64, voiceBase64 }], readVerbs };
  return { parts: [{ text: `🇮🇹 *Verbo del giorno: ${infinitive}*`, imageBase64 }, { text, voiceBase64 }], readVerbs };
}

// Tema da pergunta do dia. Os temas possíveis são os de todas as lições até
// a atual (a primeira que o aluno ainda não concluiu), inclusive: o que ele
// está estudando e revisão do que já passou. Um por dia, em rodízio, pra
// não mandar sempre o mesmo tema.
export async function pickThemeOfTheDay(user: User & { bookId?: string }, dateKey: string) {
  const bookLessons = (await mongoDb.find<any[]>('lessons', { bookId: user.bookId }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const concluded = new Set(
    (user.lessons ?? []).filter((lesson) => lesson.finalConsiderations).map((lesson) => lesson.lessonId),
  );

  const currentIndex = bookLessons.findIndex((lesson) => !concluded.has(lesson.lessonId));
  const reached = currentIndex === -1 ? bookLessons : bookLessons.slice(0, currentIndex + 1);

  const pool: { lessonId: string; lesson: string; theme: string; description: string }[] = [];
  for (const lesson of reached) {
    const themes = await mongoDb.find<any[]>('themes', { lessonId: lesson.lessonId });
    for (const item of themes) {
      if (item.theme) {
        pool.push({ lessonId: lesson.lessonId, lesson: lesson.title, theme: item.theme, description: item.description ?? '' });
      }
    }
  }
  if (!pool.length) return null;

  const dayNumber = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS);
  return pool[dayNumber % pool.length];
}

// Pergunta do dia: o Don pergunta algo sobre um tema das lições do aluno,
// pra ele responder (texto ou áudio) e ser corrigido. O tema e o ângulo da
// pergunta mudam conforme o dia.
export async function buildQuestionMessage(
  user: User & { bookId?: string },
  dateKey: string,
): Promise<ScheduledMessage | null> {
  const current = await pickThemeOfTheDay(user, dateKey);
  if (!current) return null;

  const dayNumber = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS);
  const response = await new LLMService(llmConfig.responseModel).generatedStructure<DailyQuestionType>(
    buildDailyQuestionSystemPrompt(user.level, current.theme, current.lesson, dayNumber, current.description),
    'Write the question of the day.',
    DailyQuestionSchema,
  );
  const question = response.data?.question?.trim();
  if (!response.success || !question) {
    throw new Error(`Failed to generate daily question: ${response.error}`);
  }

  // Explicação curta do tema (gerada com a lição) antes da pergunta, na mesma
  // mensagem: o aluno relembra o tema e já responde. Tema antigo sem
  // descrição: vai só a pergunta.
  const text = [
    `🇮🇹 *Domanda del giorno*`,
    `_${current.theme}_`,
    ``,
    ...(current.description ? [current.description.trim(), ``, `*Domanda:*`] : []),
    question,
    ``,
    `Responda por texto ou áudio que o Don corrige.`,
    ``,
    `📚 Estude a lição no app: ${scheduleConfig.appUrl}/lesson-time?lessonId=${encodeURIComponent(current.lessonId)}`,
    `Para avançar nos temas, pratique pelo aplicativo: é lá que o seu progresso conta.`,
  ].join('\n');

  return { parts: [{ text }] };
}

const randomPause = () =>
  new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 2500));

// Pausa curta entre as mensagens de um mesmo envio.
const shortPause = () => new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));

async function sendPart(chatId: string, part: MessagePart) {
  if (part.imageBase64) await wahaService.sendImage(chatId, part.imageBase64, part.text);
  else await wahaService.sendText(chatId, part.text);
  if (part.voiceBase64) await wahaService.sendVoice(chatId, part.voiceBase64);
}

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

        // A primeira mensagem decide: se falhar, nada foi enviado e o envio é
        // tentado de novo no próximo minuto. As seguintes, se falharem, ficam
        // só no log — repetir tudo duplicaria o que já chegou.
        const [first, ...rest] = message.parts;
        await sendPart(chatId, first);
        for (const part of rest) {
          await shortPause();
          await sendPart(chatId, part).catch((error: any) => {
            logger.warn({ userId: user.userId, type: config.type, error: error.message }, 'Uma das mensagens do envio falhou');
          });
        }
        // Só depois de enviado: marca o verbo como lido, pro próximo ser outro.
        if (message.readVerbs) {
          await mongoDb.updateOne('users', { userId: user.userId }, { $set: { whatsReadVerbs: message.readVerbs } });
        }
        // Guarda na conversa do dia, pro Don saber ao que o aluno está respondendo.
        await appendToConversation(user.userId, dateKey, [
          { role: 'assistant', content: message.parts.map((part) => part.text).join('\n\n') },
        ]);

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
