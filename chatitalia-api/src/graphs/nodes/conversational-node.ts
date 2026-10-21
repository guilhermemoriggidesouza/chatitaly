import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import {
  buildConversationalSystemPrompt,
  ConversationalAgentSchema,
  ConversationalAgentType,
} from '../../prompts/conversational-agent';
// RAG desativado: o conteúdo do tema vai no prompt (getThemeContent).
// import { ragService } from '../../services/rag-service';
// import { rag } from '../../config';
import { getThemeContent } from '../../services/lesson-content';
import { GraphState } from '../build-graph';

// Aluno praticando o tema (não é pergunta): manda a LIÇÃO atual inteira no
// prompt e ancora a fala + a pergunta única nesse conteúdo.
export function conversationalNode(llm: LLMService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input ConversationalNode');

    
    const themeChanged =
      state.plannerLogic === 'theme_completed' ||
      state.plannerLogic === 'lesson_completed' ||
      Boolean(state.completed?.themeId && state.completed.themeId !== state.current?.themeId);

    const previousTheme = themeChanged ? state.completed?.theme ?? '' : '';
    const history = themeChanged ? [] : state.messages ?? [];

    // const ragContext = await ragService.search(state.current.lessonId, state.current.theme ?? '', rag.topKTheme);
    const themeContent = await getThemeContent(state.current.themeId, state.current.lessonId);

    const sysPrompt = buildConversationalSystemPrompt(
      state.errors ?? [],
      state.finalConsiderations ?? '',
      state.current,
      state.input ?? '',
      themeContent,
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
