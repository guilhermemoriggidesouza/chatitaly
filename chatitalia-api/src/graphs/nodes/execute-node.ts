import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import { Tooling } from '../../tools';
import { GraphState } from '../build-graph';

export function executeNode(llm: LLMService, tools: Tooling) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input executeNode');

    const toolNames = state.steps
    if (!toolNames) {
      throw new Error(`Invalid tool action: ${state.action}`);
    }

    const executionTools = tools.listOfTools;
    const sysPrompt = JSON.stringify({
      role: 'Tool Execution Agent',
      steps: state.steps,
      availableTools: executionTools.map((tool) => ({ name: tool.name, description: tool.description })),
      rules: [
        'Use the steps to identify the tool to execute.',
        'Execute the exact order of the array of steps',
        'Call only the tools identified by steps.',
        'Use state from the user prompt as the tool input.',
      ],
    });
    const userPrompt = JSON.stringify({ state });

    const execution = await llm.executeLLM(
      sysPrompt,
      userPrompt,
      executionTools
    );

    if (!execution.success || !execution.data) {
      throw new Error(execution.error ?? `Failed to execute ${toolNames.join(`, `)}`);
    }
    const toolMessages = [...((execution.data as any).messages ?? [])]
      .reverse().filter(message => toolNames.includes(message.name))

    const resultSelectedTheme = JSON.parse(String(toolMessages.find(tm => tm.name == 'select_theme_for_lesson').content));
    const resultAdvanceRaw = toolMessages.find(tm => tm.name == 'advance_learning')?.content
    const resultAdvance = resultAdvanceRaw ? JSON.parse(String(resultAdvanceRaw)) : null;
    logger.info(resultSelectedTheme, 'result tool select_theme_for_lesson')
    logger.info(resultAdvance, 'result tool advance_learning')
    return {
      ...state,
      action: 'final_response',
      plannerLogic: resultAdvance?.plannerLogic ?? resultSelectedTheme.plannerLogic,
      executed: true,
      current: {
        ...state.current,
        ...resultSelectedTheme.current
      },
      completed: resultAdvance?.completed,
    };
  };
}