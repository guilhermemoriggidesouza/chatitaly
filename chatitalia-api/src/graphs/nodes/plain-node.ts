import { LLMService } from '../../infra/llm';
import { Lesson } from '../../infra/models/lesson';
import { Datastore } from '../../infra/mongodb';
import logger from '../../logger';
import { buildSystemPrompt, PlannerResponseSchema, PlannerResponseType } from '../../prompts/plain-agent';
import { selectNextTheme } from '../../services/theme-selector';
import { GraphState } from '../build-graph';

// Normaliza para "como soa": sem acento, sem pontuação, minúsculo.
const COMBINING_MARKS = /[̀-ͯ]/g;
const SPEECH_IRRELEVANT_PUNCT = /[.,!?;:…"'`«»~()\[\]{}\/\\_*–—-]/g;
const normalizeForSpeech = (value: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '') // tira acentos
    .toLowerCase()
    .replace(SPEECH_IRRELEVANT_PUNCT, ' ') // pontuação -> espaço
    .replace(/\s+/g, ' ')
    .trim();

// Erro cuja única diferença é ESCRITA (maiúscula, pontuação, "...", acento).
// O aluno está FALANDO: isso nunca é um erro. Trava determinística, não
// depende do LLM obedecer o prompt.
const isWritingOnlyError = (error: { original?: string; correction?: string }): boolean => {
  const original = normalizeForSpeech(error?.original ?? '');
  const correction = normalizeForSpeech(error?.correction ?? '');
  return original.length > 0 && original === correction;
};

export function plainNode(llm: LLMService, db: Datastore) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input PlainNode');

    let current = state.current;

    // Sem tema selecionado: escolhe programaticamente (mesma lógica da tool).
    if (!current.themeId) {
      const picked = await selectNextTheme(db, current);
      if (picked?.themeId) {
        current = { ...current, ...picked };
        logger.info({ picked }, 'PlainNode: theme choosed programatically (select_theme_for_lesson)');
      }
    }

    try {
      const [lesson] = await db.find<Lesson[]>('lessons', { lessonId: current.lessonId });

      const history = state.messages ?? [];
      const userMessagesOnTheme = history.filter((message) => message.role === 'user').length;

      const sysPrompt = buildSystemPrompt(
        current,
        userMessagesOnTheme,
      );
      const response = await llm.generatedStructure<PlannerResponseType>(
        sysPrompt,
        state.input!,
        PlannerResponseSchema,
        history,
      );

      logger.info({ llmResponse: response.data, state }, 'output PlainNode');

      // Descarta erros que são só de escrita (o LLM ainda escapa isso às vezes).
      const rawErrors = response.data?.errors ?? [];
      const errors = rawErrors.filter((error) => !isWritingOnlyError(error));
      if (errors.length !== rawErrors.length) {
        logger.info(
          { removed: rawErrors.filter(isWritingOnlyError) },
          'PlainNode: erros só de escrita (maiúscula/pontuação/acento) descartados',
        );
      }

      return {
        ...state,
        current,
        errors,
        plained: true,
        finalConsiderations: response.data?.finalConsiderations,
        plannerLogic: response.data?.plannerLogic,
      };
    } catch (error) {
      logger.error(error);
      return { current };
    }
  };
}
