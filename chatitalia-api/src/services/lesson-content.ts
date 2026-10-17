import { mongoDb } from '../infra/mongodb';
import logger from '../logger';

// Conteúdo completo da lição (markdown gerado no processamento do PDF), que
// vai inteiro no prompt do plain-node e do conversational-node. Sem lição ou
// com falha no Mongo devolve '': o Don segue a conversa sem o conteúdo.
export async function getLessonContent(lessonId: string | undefined): Promise<string> {
  if (!lessonId) return '';

  try {
    const lesson = await mongoDb.findOne('lessons', { lessonId });
    return lesson?.lessonContent ?? '';
  } catch (error: any) {
    logger.error({ lessonId, error: error.message }, 'Falha ao buscar conteúdo da lição');
    return '';
  }
}
