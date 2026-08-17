import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import { buildResponseSystemPrompt, ResponseAgentSchema, ResponseAgentType } from '../../prompts/response-agent';
import { GraphState } from '../build-graph';

export function responseNode(llm: LLMService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'ResponseNode finished');
    const sysPrompt = buildResponseSystemPrompt(
      state.action,
      state.errors!,
      state.finalConsiderations!,
      state.theme!,
      state.newLevel!,
      state.newTheme!,
      state.lesson!,
      state.newLesson!,
      state.messages!
    )
    const response = await llm.generatedStructure<ResponseAgentType>(sysPrompt, state.input!, ResponseAgentSchema, [])
    return {
      finalResponse: response.data!
    };
  };
}
