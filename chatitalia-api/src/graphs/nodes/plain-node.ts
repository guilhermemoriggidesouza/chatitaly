import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import { buildSystemPrompt, PlannerResponseSchema, PlannerResponseType } from '../../prompts/plain-agent';
import { ragService } from '../../services/rag-service';
import { rag } from '../../config';
import { GraphState } from '../build-graph';

// 2º node do grafo: só decide 'advance' vs 'final_response' (o tema já vem
// resolvido e os erros já vêm prontos do error-node). Busca RAG própria, na
// LIÇÃO atual (não no livro inteiro — mais coeso, escopo menor) pelo TEMA.
export function plainNode(llm: LLMService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input PlainNode');

    try {
      const history = state.messages ?? [];
      const userMessagesOnTheme = history.filter((message) => message.role === 'user').length;

      const ragContext = await ragService.search(state.current.lessonId, state.current.theme ?? '', rag.topKMessage);
      const sysPrompt = buildSystemPrompt(state.current, userMessagesOnTheme, ragContext);
      const response = await llm.generatedStructure<PlannerResponseType>(
        sysPrompt,
        state.input!,
        PlannerResponseSchema,
        history,
      );

      logger.info({ llmResponse: response.data, state }, 'output PlainNode');

      return {
        ...state,
        plained: true,
        finalConsiderations: response.data?.finalConsiderations,
        plannerLogic: response.data?.plannerLogic,
        responseRoute: response.data?.responseRoute,
      };
    } catch (error) {
      logger.error(error);
      return {};
    }
  };
}
