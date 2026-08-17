import { LLMService } from '../../infra/llm';
import logger from '../../logger';
import { buildInitSystemPrompt, InitResponseSchema, InitResponseType } from '../../prompts/init-agent';
import { GraphState } from '../build-graph';
import { Tooling } from '../../tools';

export function initNode(llm: LLMService, tools: Tooling) {
    return async (state: GraphState): Promise<Partial<GraphState>> => {
        logger.info({ state }, 'InitNode');

        const sysPrompt = buildInitSystemPrompt(
            state.userId!,
            state.lessonId!,
        );

        const response = await llm.generatedStructure<InitResponseType>(
            sysPrompt,
            state.input!,
            InitResponseSchema,
            tools.listOfTools
        );

        logger.info(response);

        return {
            ...state,
            theme: response.data?.chosedTheme!,
            themeId: response.data?.chosedThemeId!,
            action: "continue"
        };
    };
}
