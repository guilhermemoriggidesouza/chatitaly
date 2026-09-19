import { z } from 'zod/v3';
import {
    StateGraph,
    START,
    END,
} from '@langchain/langgraph';
import { errorNode } from './nodes/error-node';
import { plainNode } from './nodes/plain-node';
import { advanceNode } from './nodes/advance-node';
import { answerNode } from './nodes/answer-node';
import { conversationalNode } from './nodes/conversational-node';
import { LLMService } from '../infra/llm';
import { config } from '../config';
import { Datastore } from '../infra/mongodb';
import { Message, Errors, Context, FinalResponse } from './schemas';

const State = z.object({
    finished: z.boolean().optional(),
    plained: z.boolean().optional(),
    executed: z.boolean().optional(),
    plannerLogic: z.string(),
    // decidido pelo plain-node: pra qual node de resposta o grafo vai depois.
    responseRoute: z.string().optional(),

    current: Context,
    completed: Context,

    input: z.string().optional(),
    messages: z.array(Message).optional(),

    errors: Errors.optional(),
    finalConsiderations: z.string().optional(),
    finalResponse: FinalResponse,
})

export type GraphState = z.infer<typeof State>;
export type MessageState = z.infer<typeof Message>;

// error_verify -> plain -> (advance ->) conversational -> END
//                       \-> answer -----------------------> END
export const buildGraph = (db: Datastore) => {
    // Um modelo por node: barato (erros) -> médio (decisão) -> melhor (fala final).
    const errorLlm = new LLMService(config.errorModel);
    const plannerLlm = new LLMService(config.plannerModel);
    const responseLlm = new LLMService(config.responseModel);

    const workflow = new StateGraph({
        stateSchema: State,
    })
        .addNode('error_verify', errorNode(errorLlm, db))
        .addNode('plain', plainNode(plannerLlm))
        .addNode('advance', advanceNode(db))
        .addNode('answer', answerNode(responseLlm))
        .addNode('conversational', conversationalNode(responseLlm))

        .addEdge(START, 'error_verify')
        .addEdge('error_verify', 'plain')

        // 'advance' sempre implica prática no tema (nunca pergunta), então vai
        // direto pro conversational depois de marcar o tema como concluído.
        .addConditionalEdges('plain', (state: GraphState) =>
            state.plannerLogic === 'advance' ? 'advance' : (state.responseRoute || 'conversational')
        )

        .addEdge('advance', 'conversational')
        .addEdge('answer', END)
        .addEdge('conversational', END)


    return workflow.compile()
}
