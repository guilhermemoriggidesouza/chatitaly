import { tool } from 'langchain';
import { z } from 'zod/v3';
import { mongoDb } from '../infra/mongodb';
import logger from '../logger';
import { Lesson, User } from '../infra/models/user';
import { Context } from '../graphs/schemas';

type ThemeDocument = {
  _id: unknown;
  theme?: string;
  themeId?: string;
};

export function selectThemeByLesson() {
  return tool(
    async ({ current }) => {
      logger.info({ current }, 'INIT selectThemeByLesson')
      try {
        const themesFromThisLesson = await mongoDb.find<ThemeDocument[]>('themes', { lessonId: current.lessonId });
        const [user] = await mongoDb.find<User[]>('users', { userId: current.userId })
        if (!user) {
          throw new Error(`Usuário não achado`)
        }
        const currentLesson = user.lessons.find(le => le.lessonId == current.lessonId)
        const userThemeInLesson = currentLesson?.themeIds ?? []
        const unfinishedThemes = themesFromThisLesson?.filter(theme => !userThemeInLesson?.includes(theme.themeId!))
        if (unfinishedThemes.length == 0) {
          const unfinishedLessons = user.lessons.filter(lesson => !lesson.finalConsiderations)
          const [nextLesson] = unfinishedLessons
          const [nextThemes] = await mongoDb.find<ThemeDocument[]>('themes', { lessonId: nextLesson.lessonId });

          return JSON.stringify({
            current: {
              lessonId: nextLesson.lessonId,
              lesson: nextLesson.name,
              status: "completed",
              theme: nextThemes.theme,
              themeId: nextThemes.themeId,
              plannerLogic: 'continue'
            }
          })
        }

        const selectedTheme = unfinishedThemes.find((theme) => theme.theme)!;
        return JSON.stringify({
          current: {
            ...current,
            status: "completed",
            lesson: currentLesson?.name,
            theme: selectedTheme.theme,
            themeId: selectedTheme.themeId,
            plannerLogic: 'continue'
          }
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