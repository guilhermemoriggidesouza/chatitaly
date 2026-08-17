import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import { buildSystemPrompt, PlannerResponseSchema, PlannerResponseType } from '../../prompts/plain-agent';
import { GraphState } from '../build-graph';
import { Tooling } from '../../tools';
import { createSelectLessonThemeTool } from '../../tools/select-lesson-theme-tool';

export function plainNode(llm: LLMService, tools: Tooling) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input PlainNode');

    const sysPrompt = buildSystemPrompt(state.level, state.theme, state.lessonId, state.messages!)
    try {
      const response = await llm.generatedStructure<PlannerResponseType>(
        sysPrompt,
        state.input!,
        PlannerResponseSchema,
        [createSelectLessonThemeTool()]
      )

      logger.info({ llmResponse: response.data, state }, 'output PlainNode')

      return {
        ...state,
        action: response.data?.action,
        theme: response.data?.selectedTheme ?? state.theme,
        themeId: response.data?.selectedThemeId ?? state.themeId,
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
