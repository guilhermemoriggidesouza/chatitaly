import { z } from 'zod/v3';
import {
    StateGraph,
    START,
    END,
} from '@langchain/langgraph';
import { plainNode } from './nodes/plain-node';
import { responseNode } from './nodes/response-node';
import { LLMService } from '../infra/llm';
import { Step, Message, Errors } from './schemas';
import { advanceNode } from './nodes/advance-node';
import { Tooling } from '../tools';
import { ResponseAgentSchema } from '../prompts/response-agent';

const State = z.object({
    finished: z.boolean().optional(),
    level: z.string().optional(),
    theme: z.string().optional(),
    userId: z.string().optional(),
    errors: Errors.optional(),
    finalConsiderations: z.string().optional(),
    plained: z.boolean().optional(),
    advanced: z.boolean().optional(),
    newLevel: z.string().optional(),
    newTheme: z.string().optional(),
    finalResponse: ResponseAgentSchema,
    action: z.string().optional(),
    messages: z.array(Message).optional(),
    input: z.string().optional()
})

export type GraphState = z.infer<typeof State>;
export type MessageState = z.infer<typeof Message>;
export type StepState = z.infer<typeof Step>;

export const buildGraph = (llm: LLMService, tools: Tooling) => {
    const workflow = new StateGraph({
        stateSchema: State,
    })
        .addNode('plain', plainNode(llm))
        .addNode('advance', advanceNode(llm, tools))
        .addNode('final_response', responseNode(llm))

        .addEdge(START, 'plain')

        .addConditionalEdges('plain', (state: GraphState) => {
            if (state.action == "advance") {
                return 'advance'
            } else {
                return 'final_response'
            }
        })

        .addEdge('advance', 'final_response')
        .addEdge('final_response', END)


    return workflow.compile()
}
