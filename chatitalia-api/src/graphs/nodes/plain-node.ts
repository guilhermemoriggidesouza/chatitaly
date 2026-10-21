import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import { buildSystemPrompt, PlannerResponseSchema, PlannerResponseType } from '../../prompts/plain-agent';
// RAG desativado: o conteúdo do tema vai no prompt (getThemeContent).
// import { ragService } from '../../services/rag-service';
// import { rag } from '../../config';
import { getThemeContent } from '../../services/lesson-content';
import { GraphState } from '../build-graph';

export function plainNode(llm: LLMService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input PlainNode');

    try {
      const history = state.messages ?? [];
      const userMessagesOnTheme = history.filter((message) => message.role === 'user').length;

      // const ragContext = await ragService.search(state.current.lessonId, state.current.theme ?? '', rag.topKMessage);
      const themeContent = await getThemeContent(state.current.themeId, state.current.lessonId);
      const sysPrompt = buildSystemPrompt(state.current, userMessagesOnTheme, themeContent);
      const response = await llm.generatedStructure<PlannerResponseType>(
        sysPrompt,
        state.input!,
        PlannerResponseSchema,
        history,
      );

      logger.info({ llmResponse: response.data, state }, 'output PlainNode');

      const plannerLogic = response.data?.plannerLogic;

      let finalConsiderations = response.data?.finalConsiderations;
      if (plannerLogic !== 'advance') {
        finalConsiderations = '';
      }

      return {
        ...state,
        plained: true,
        finalConsiderations,
        plannerLogic,
        responseRoute: response.data?.responseRoute,
      };
    } catch (error) {
      logger.error(error);
      return {};
    }
  };
}
