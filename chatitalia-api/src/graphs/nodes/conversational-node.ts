import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import {
  buildConversationalSystemPrompt,
  ConversationalAgentSchema,
  ConversationalAgentType,
  ConversationalRepeatSchema,
  ConversationalRepeatType,
  isRepeatMode,
} from '../../prompts/conversational-agent';
import { joinSentences } from '../../prompts/language-mix';
// RAG desativado: o conteúdo do tema vai no prompt (getThemeContent).
// import { ragService } from '../../services/rag-service';
// import { rag } from '../../config';
import { getThemeContent } from '../../services/lesson-content';
import { GraphState } from '../build-graph';

// Aluno praticando o tema (não é pergunta): manda a LIÇÃO atual inteira no
// prompt e ancora a fala + o fecho nesse conteúdo. Fecho: no A1/A2 com erro,
// a frase corrigida pro aluno falar ("Agora é a sua vez, fale: ..."); sem
// erro (ou B1+), uma pergunta.
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
    // A1/A2 com erro: termina pedindo pro aluno FALAR a frase corrigida. O
    // modelo só copia a frase; o pedido é colado aqui no fim do texto (em
    // português) e da fala do áudio (em italiano). Mesma condição do prompt.
    if (isRepeatMode(state.current.level, state.errors)) {
      const response = await llm.generatedStructure<ConversationalRepeatType>(
        sysPrompt,
        state.input!,
        ConversationalRepeatSchema,
        history,
      );
      const { response: text = '', spoken = '', repeat = '' } = response.data ?? {};
      const sentence = repeat.trim().replace(/^['"«“]+|['"»”.!?]+$/g, '').trim();
      if (!sentence) return { finalResponse: { response: text, spoken } };
      return {
        finalResponse: {
          response: `${text.trim()}\n\nAgora é a sua vez, fale: '${sentence}'`,
          spoken: joinSentences(spoken || text, `Adesso tocca a te, ripeti: '${sentence}'`),
        },
      };
    }

    const response = await llm.generatedStructure<ConversationalAgentType>(
      sysPrompt,
      state.input!,
      ConversationalAgentSchema,
      history,
    );

    return { finalResponse: { ...response.data! } };
  };
}
