import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import { buildAnswerSystemPrompt, AnswerAgentSchema, AnswerAgentType } from '../../prompts/answer-agent';
import { ragService } from '../../services/rag-service';
import { rag } from '../../config';
import { GraphState } from '../build-graph';

// Aluno fez uma pergunta/pedido de ajuda: corrige + responde (com apoio do
// RAG, se ajudar) + 1 pergunta leve.
export function answerNode(llm: LLMService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input AnswerNode');

    const ragContext = await ragService.search(state.current.bookId, state.input ?? '', rag.topKMessage);
    const sysPrompt = buildAnswerSystemPrompt(state.errors ?? [], state.current, state.input ?? '', ragContext);
    const history = state.messages ?? [];
    const response = await llm.generatedStructure<AnswerAgentType>(
      sysPrompt,
      state.input!,
      AnswerAgentSchema,
      history,
    );

    return { finalResponse: { ...response.data! } };
  };
}
