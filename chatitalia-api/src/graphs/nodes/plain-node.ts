import { LLMService } from '../../infra/llm';
import { Lesson } from '../../infra/models/lesson';
import { Datastore } from '../../infra/mongodb';
import logger from '../../logger';
import { buildSystemPrompt, PlannerResponseSchema, PlannerResponseType } from '../../prompts/plain-agent';
import { selectNextTheme } from '../../services/theme-selector';
import { GraphState } from '../build-graph';

export function plainNode(llm: LLMService, db: Datastore) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input PlainNode');

    let current = state.current;

    // Sem tema selecionado: escolhe programaticamente (mesma lógica da tool).
    if (!current.themeId) {
      const picked = await selectNextTheme(db, current);
      if (picked?.themeId) {
        current = { ...current, ...picked };
        logger.info({ picked }, 'PlainNode: tema escolhido programaticamente (select_theme_for_lesson)');
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

      return {
        ...state,
        current,
        errors: response.data?.errors,
        plained: true,
        finalConsiderations: response.data?.finalConsiderations,

        action: response.data?.action,
        steps: response.data?.steps,
        plannerLogic: response.data?.plannerLogic,
      };
    } catch (error) {
      logger.error(error);
      return { current };
    }
  };
}
