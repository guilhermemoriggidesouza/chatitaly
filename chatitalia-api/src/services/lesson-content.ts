import { mongoDb } from '../infra/mongodb';
import logger from '../logger';

// Conteúdo do tema atual que vai no prompt do plain-node e do
// conversational-node: a descrição do tema (gerada junto com a lição, curta e
// completa). Tema sem descrição (lições antigas): cai na lição inteira. Sem
// nada ou com falha no Mongo devolve '': o Don segue a conversa sem conteúdo.
export async function getThemeContent(themeId: string | undefined, lessonId: string | undefined): Promise<string> {
  try {
    if (themeId) {
      const theme = await mongoDb.findOne('themes', { themeId });
      if (theme?.description) return theme.description;
    }
    if (!lessonId) return '';
    const lesson = await mongoDb.findOne('lessons', { lessonId });
    return lesson?.lessonContent ?? '';
  } catch (error: any) {
    logger.error({ themeId, lessonId, error: error.message }, 'Falha ao buscar conteúdo do tema');
    return '';
  }
}
