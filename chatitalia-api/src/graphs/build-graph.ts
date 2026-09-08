import { z } from 'zod/v3';
import {
    StateGraph,
    START,
    END,
} from '@langchain/langgraph';
import { plainNode } from './nodes/plain-node';
import { responseNode } from './nodes/response-node';
import { LLMService } from '../infra/llm';
import { config } from '../config';
import { Datastore } from '../infra/mongodb';
import { Message, Errors, Context } from './schemas';
import { ResponseAgentSchema } from '../prompts/response-agent';
import { advanceNode } from './nodes/advance-node';

const State = z.object({
    finished: z.boolean().optional(),
    plained: z.boolean().optional(),
    executed: z.boolean().optional(),
    plannerLogic: z.string(),

    current: Context,
    completed: Context,

    input: z.string().optional(),
    messages: z.array(Message).optional(),

    errors: Errors.optional(),
    finalConsiderations: z.string().optional(),
    finalResponse: ResponseAgentSchema,
})

export type GraphState = z.infer<typeof State>;
export type MessageState = z.infer<typeof Message>;

export const buildGraph = (llm: LLMService, db: Datastore) => {
    // Planner num modelo mais forte (regras + JSON); Don fica no `llm` padrão.
    const plannerLlm = new LLMService(config.plannerModel);

    const workflow = new StateGraph({
        stateSchema: State,
    })
        .addNode('plain', plainNode(plannerLlm, db))
        .addNode('advance', advanceNode(db))
        .addNode('final_response', responseNode(llm))

        .addEdge(START, 'plain')

        .addConditionalEdges('plain', (state: GraphState) => state.plannerLogic)

        .addEdge('advance', 'final_response')
        .addEdge('final_response', END)


    return workflow.compile()
}
