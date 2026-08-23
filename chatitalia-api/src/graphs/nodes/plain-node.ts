import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import { buildSystemPrompt, PlannerResponseSchema, PlannerResponseType } from '../../prompts/plain-agent';
import { GraphState } from '../build-graph';

export function plainNode(llm: LLMService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input PlainNode');

    try {
      const sysPrompt = buildSystemPrompt(
        state.current,
        state.messages!
      )
      const response = await llm.generatedStructure<PlannerResponseType>(
        sysPrompt,
        state.input!,
        PlannerResponseSchema,
      )

      logger.info({ llmResponse: response.data, state }, 'output PlainNode')

      return {
        ...state,
        errors: response.data?.errors,
        plained: true,
        finalConsiderations: response.data?.finalConsiderations,

        action: response.data?.action,
        steps: response.data?.steps,
        plannerLogic: response.data?.plannerLogic,
      };
    } catch (error) {
      logger.error(error)
      return {}
    }

  };
}
