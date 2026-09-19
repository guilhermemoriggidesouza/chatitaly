import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import {
  buildConversationalSystemPrompt,
  ConversationalAgentSchema,
  ConversationalAgentType,
} from '../../prompts/conversational-agent';
import { ragService } from '../../services/rag-service';
import { rag } from '../../config';
import { GraphState } from '../build-graph';

// Aluno praticando o tema (não é pergunta): busca RAG #2 na LIÇÃO atual
// (baseada no tema) e ancora a fala + a pergunta única nesse conteúdo.
export function conversationalNode(llm: LLMService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input ConversationalNode');

    // Tema mudou neste turno (veio do advance-node)? O histórico é todo do
    // tema ANTERIOR e puxaria a pergunta pro assunto errado — não manda.
    const themeChanged =
      state.plannerLogic === 'theme_completed' ||
      state.plannerLogic === 'lesson_completed' ||
      Boolean(state.completed?.themeId && state.completed.themeId !== state.current?.themeId);

    const previousTheme = themeChanged ? state.completed?.theme ?? '' : '';
    const history = themeChanged ? [] : state.messages ?? [];

    const ragContext = await ragService.search(state.current.lessonId, state.current.theme ?? '', rag.topKTheme);

    const sysPrompt = buildConversationalSystemPrompt(
      state.errors ?? [],
      state.finalConsiderations ?? '',
      state.current,
      state.input ?? '',
      ragContext,
      previousTheme,
    );
    const response = await llm.generatedStructure<ConversationalAgentType>(
      sysPrompt,
      state.input!,
      ConversationalAgentSchema,
      history,
    );

    return { finalResponse: { ...response.data! } };
  };
}
