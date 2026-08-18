import { LLMService } from '../../infra/llm';
import { Tooling } from '../../tools';
import { GraphState } from '../build-graph';
import { createAdvanceLearningTool } from '../../tools/advance-learning-tool';

export function executeNode(llm: LLMService, tools: Tooling) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const toolName = state.action?.replace(/^tool:/, '');
    if (!toolName || state.action === toolName) {
      throw new Error(`Invalid tool action: ${state.action}`);
    }

    const executionTools = [...tools.listOfTools, createAdvanceLearningTool()];
    const sysPrompt = JSON.stringify({
      role: 'Tool Execution Agent',
      action: state.action,
      availableTools: executionTools.map((tool) => ({ name: tool.name, description: tool.description })),
      rules: [
        'Use action to identify the tool to execute.',
        'Call only the tool identified by action.',
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
      throw new Error(execution.error ?? `Failed to execute ${toolName}`);
    }

    const toolMessage = [...((execution.data as any).messages ?? [])]
      .reverse()
      .find((message: any) => message.name === toolName);


    const result = JSON.parse(String(toolMessage.content));
    return {
      ...state,
      action: 'continue',
      theme: result.theme,
      themeId: result.themeId,
      level: result.level,
      lessonId: result.lessonId,
      newLevel: result.completed?.level,
      newTheme: result.completed?.theme,
      newThemeId: result.completed?.themeId,
      newLessonId: result.completed?.lessonId,
      advanced: true,
    };
  };
}