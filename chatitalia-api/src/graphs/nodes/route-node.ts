import logger from '../../logger';
import { MIN_USER_MESSAGES_TO_ADVANCE } from '../../prompts/plain-agent';
import { GraphState } from '../build-graph';

// 2º node do grafo, roda logo depois do error_verify. Decide pra onde ir
// SEM LLM — só olhando tema/lição presentes e quantas mensagens o aluno já
// mandou nesse tema:
// - sem themeId/lessonId -> answer (não tem tema pra praticar, é pergunta/livre)
// - com tema, mas ainda abaixo do mínimo de prática -> conversational direto
//   (nem vale a pena perguntar pro plain-agent se dá pra avançar: ainda não dá)
// - com tema e já passou do mínimo -> plain (aí sim vale chamar o LLM pra
//   decidir advance/final_response e answer/conversational)
export function routeNode() {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const hasTheme = Boolean(state.current.themeId && state.current.lessonId);
    const history = state.messages ?? [];
    const userMessagesOnTheme = history.filter((message) => message.role === 'user').length;

    let entryRoute: 'answer' | 'conversational' | 'plain';
    if (!hasTheme) {
      entryRoute = 'answer';
    } else if (userMessagesOnTheme > MIN_USER_MESSAGES_TO_ADVANCE) {
      entryRoute = 'plain';
    } else {
      entryRoute = 'conversational';
    }

    logger.info({ hasTheme, userMessagesOnTheme, entryRoute }, 'RouteNode: decisão programática');

    return { entryRoute };
  };
}
