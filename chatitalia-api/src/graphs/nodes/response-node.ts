import { LLMService } from '../../infra/llm';
import { Lesson } from '../../infra/models/lesson';
import { mongoDb } from '../../infra/mongodb';
import logger from '../../logger';
import { buildResponseSystemPrompt, ResponseAgentSchema, ResponseAgentType } from '../../prompts/response-agent';
import { GraphState } from '../build-graph';

export function responseNode(llm: LLMService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input ResponseNode');
    const [lesson] = await mongoDb.find<Lesson[]>('lessons', { lessonId: state.current.lessonId })

    // Tema mudou neste turno? Então o histórico é todo do tema ANTERIOR e
    // puxaria a pergunta de follow-up para o assunto errado. Não manda o
    // histórico e informa o tema recém-concluído para o prompt evitá-lo.
    const themeChanged =
      state.plannerLogic === 'theme_completed' ||
      state.plannerLogic === 'lesson_completed' ||
      Boolean(state.completed?.themeId && state.completed.themeId !== state.current?.themeId)

    const previousTheme = themeChanged ? state.completed?.theme ?? '' : ''
    const history = themeChanged ? [] : state.messages ?? []

    const sysPrompt = buildResponseSystemPrompt(
      state.plannerLogic,
      state.errors ?? [],
      state.finalConsiderations ?? '',
      state.current,
      '', // lessonText (lesson?.lessonContent)
      state.input ?? '', // studentMessage
      previousTheme,
    )
    const response = await llm.generatedStructure<ResponseAgentType>(
      sysPrompt,
      state.input!,
      ResponseAgentSchema,
      history,
    )
    return {
      finalResponse: { ...response.data! },
    };
  };
}
