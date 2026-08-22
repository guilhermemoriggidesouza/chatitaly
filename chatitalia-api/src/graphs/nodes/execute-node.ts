import { LLMService } from '../../infra/llm';
import { Tooling } from '../../tools';
import { GraphState } from '../build-graph';

export function executeNode(llm: LLMService, tools: Tooling) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
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

    const result = JSON.parse(String(toolMessages.map(tm => tm.content).join(`\n`)));

    return {
      ...state,
      action: 'final_response',
      executed: true,
      current: {
        ...state.current,
        theme: result.theme,
        themeId: result.themeId,
        lessonId: result.lessonId
      },
      completed: result.completed,
    };
  };
}