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
    const sysPrompt = buildResponseSystemPrompt(
      state.plannerLogic,
      state.errors ?? [],
      state.finalConsiderations ?? '',
      state.current,
      state.messages ?? [],
      '', // lessonText (lesson?.lessonContent)
      state.input ?? '', // studentMessage
    )
    const response = await llm.generatedStructure<ResponseAgentType>(sysPrompt, state.input!, ResponseAgentSchema)
    return {
      finalResponse: { ...response.data! },
    };
  };
}
