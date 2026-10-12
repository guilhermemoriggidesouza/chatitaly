import { mongoDb } from '../infra/mongodb';
import { WhatsConversation, WhatsMessage } from '../infra/models/whatsapp-conversation';
import logger from '../logger';

const COLLECTION = 'whatsapp_conversations';
// Quantas mensagens recentes do dia entram como histórico pro modelo.
const HISTORY_LIMIT = 30;

// A conversa salva é um extra: nenhuma das duas funções abaixo lança erro.
// Se o Mongo falhar, o envio e a resposta do Don seguem normalmente — só
// fica registrado no log.

// Mensagens do dia do aluno, no formato que o grafo do chat espera. Os dias
// anteriores continuam salvos, só não entram no contexto. Devolve [] se não
// conseguir ler.
export async function getConversationHistory(
  userId: string,
  dateKey: string,
): Promise<{ role: string; content: string }[]> {
  try {
    const conversation = (await mongoDb.findOne(COLLECTION, { userId, dateKey })) as WhatsConversation | null;
    return (conversation?.messages ?? [])
      .slice(-HISTORY_LIMIT)
      .map(({ role, content }) => ({ role, content }));
  } catch (error: any) {
    logger.warn({ userId, error: error.message }, 'WhatsApp: não foi possível ler a conversa do dia; seguindo sem histórico');
    return [];
  }
}

// Guarda mensagens na conversa do dia (cria o documento do dia se não existir).
export async function appendToConversation(
  userId: string,
  dateKey: string,
  messages: Pick<WhatsMessage, 'role' | 'content'>[],
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const stamped = messages.map((message) => ({ ...message, at: now }));

    const result = await mongoDb.updateOne(
      COLLECTION,
      { userId, dateKey },
      { $push: { messages: { $each: stamped } }, $set: { updatedAt: now } },
    );
    if (result.matchedCount === 0) {
      await mongoDb.insertOne(COLLECTION, { userId, dateKey, messages: stamped, updatedAt: now });
    }
  } catch (error: any) {
    logger.warn({ userId, error: error.message }, 'WhatsApp: não foi possível salvar a conversa; seguindo sem salvar');
  }
}
