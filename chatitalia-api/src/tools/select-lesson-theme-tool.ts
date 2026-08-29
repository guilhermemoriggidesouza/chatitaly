import { tool } from 'langchain';
import { z } from 'zod/v3';
import { mongoDb } from '../infra/mongodb';
import logger from '../logger';
import { Context } from '../graphs/schemas';
import { selectNextTheme } from '../services/theme-selector';

export function selectThemeByLesson() {
  return tool(
    async ({ current }) => {
      logger.info({ current }, 'INIT selectThemeByLesson')
      try {
        const picked = await selectNextTheme(mongoDb, current);

        if (!picked) {
          return JSON.stringify({ status: 'error', error: 'no theme available for this user' });
        }

        return JSON.stringify({
          current: {
            ...current,
            ...picked,
            status: 'completed',
            plannerLogic: 'continue',
          },
        });
      } catch (error: any) {
        logger.error(error, 'ERROR on select_theme')

        return JSON.stringify({
          status: 'error',
          error
        });
      }
    },
    {
      name: 'select_theme_for_lesson',
      description: `
        Selects the appropriate theme from MongoDB for the lesson identified by the provided lessonId.
      `, schema: z.object({
        current: Context,
      }),
    })
}
