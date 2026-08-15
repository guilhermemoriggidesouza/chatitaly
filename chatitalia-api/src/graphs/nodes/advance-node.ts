import { DynamicStructuredTool } from 'langchain';
import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import { AdvanceResponseSchema, AdvanceResponseType, buildAdvanceSystemPrompt } from '../../prompts/execute-agent';
import { GraphState } from '../build-graph';
import { Tooling } from '../../tools';

export function advanceNode(llm: LLMService, tools: Tooling) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'AdvanceNode');

    const sysPrompt = buildAdvanceSystemPrompt(state.userId!, state.finalConsiderations!, state.messages!)
    const response = await llm.generatedStructure<AdvanceResponseType>(sysPrompt, state.input!, AdvanceResponseSchema, tools.listOfTools)

    logger.info(response)
    return {
      ...state,
      theme: response.data?.currentTheme ? response.data?.currentTheme : state.theme,
      level: response.data?.currentLevel ? response.data?.currentLevel : state.level,
      newLevel: response.data?.completed.level,
      newTheme: response.data?.completed.theme,
      advanced: true
    };
  };
}
