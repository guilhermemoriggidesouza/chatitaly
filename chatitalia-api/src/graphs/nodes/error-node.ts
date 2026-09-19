import { LLMService } from '../../infra/llm';
import { Datastore } from '../../infra/mongodb';
import logger from '../../logger';
import { buildErrorSystemPrompt, ErrorAgentSchema, ErrorAgentType } from '../../prompts/error-agent';
import { selectNextTheme } from '../../services/theme-selector';
import { isWritingOnlyError } from '../../utils/spoken-errors';
import { GraphState } from '../build-graph';

// 1º node do grafo: resolve o tema (se faltar) e extrai os erros da última
// mensagem. Separado do plain-node para cada agente ter um job único.
export function errorNode(llm: LLMService, db: Datastore) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input ErrorNode');

    let current = state.current;

    // Sem tema selecionado: escolhe programaticamente (mesma lógica da tool).
    // Roda aqui pq é o 1º node — o plain-node já recebe o tema resolvido.
    if (!current.themeId) {
      const picked = await selectNextTheme(db, current);
      if (picked?.themeId) {
        current = { ...current, ...picked };
        logger.info({ picked }, 'ErrorNode: theme choosed programatically (select_theme_for_lesson)');
      }
    }

    try {
      const history = state.messages ?? [];
      const sysPrompt = buildErrorSystemPrompt(current);
      const response = await llm.generatedStructure<ErrorAgentType>(
        sysPrompt,
        state.input!,
        ErrorAgentSchema,
        history,
      );

      logger.info({ llmResponse: response.data, state }, 'output ErrorNode');

      // Descarta erros que são só de escrita (o LLM ainda escapa isso às vezes).
      const rawErrors = response.data?.errors ?? [];
      const errors = rawErrors.filter((error) => !isWritingOnlyError(error));
      if (errors.length !== rawErrors.length) {
        logger.info(
          { removed: rawErrors.filter(isWritingOnlyError) },
          'ErrorNode: erros só de escrita (maiúscula/pontuação/acento) descartados',
        );
      }

      return { ...state, current, errors };
    } catch (error) {
      logger.error(error);
      return { current };
    }
  };
}
