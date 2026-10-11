import logger from '../../logger';
import { Datastore } from '../../infra/mongodb';
import { advanceTheme } from '../../services/advance-theme';
import { selectNextTheme } from '../../services/theme-selector';
import { GraphState } from '../build-graph';

export function advanceNode(db: Datastore) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info({ state }, 'input advanceNode');

    try {
      const advanceResult = await advanceTheme(
        db,
        state.current,
        state.finalConsiderations ?? '',
      );

      if (advanceResult.plannerLogic == "lesson_completed") {
        const result: Partial<GraphState> = {
          ...state,
          plannerLogic: advanceResult.plannerLogic,
          executed: true,
          current: { ...state.current },
          completed: advanceResult.completed,
        };
        return result;
      }
      const nextTheme = await selectNextTheme(db, state.current);

      const result: Partial<GraphState> = {
        ...state,
        plannerLogic: advanceResult.plannerLogic,
        executed: true,
        current: { ...state.current, ...(nextTheme ?? {}) },
        completed: advanceResult.completed,
      };

      logger.info(result, 'advanceNode result');
      return result;
    } catch (error) {
      logger.error(error, 'advanceNode failed, falling back to final_response');
      return { ...state, plannerLogic: 'continue', executed: true };
    }
  };
}
