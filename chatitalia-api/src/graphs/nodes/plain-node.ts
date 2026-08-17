import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import { buildSystemPrompt, PlannerResponseSchema, PlannerResponseType } from '../../prompts/plain-agent';
import { GraphState } from '../build-graph';

export function plainNode(llm: LLMService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input PlainNode');

    const sysPrompt = buildSystemPrompt(state.level, state.theme, state.lesson, state.messages!)
    try {
      const response = await llm.generatedStructure<PlannerResponseType>(sysPrompt, state.input!, PlannerResponseSchema, [])

      logger.info({ llmResponse: response.data, state }, 'output PlainNode')

      return {
        ...state,
        action: response.data?.action,
        errors: response.data?.errors,
        finalConsiderations: response.data?.finalConsiderations,
        plained: true,
      };
    } catch (error) {
      logger.error(error)
      return {}
    }

  };
}
