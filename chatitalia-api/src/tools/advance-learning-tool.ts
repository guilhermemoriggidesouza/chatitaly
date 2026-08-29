import { tool } from 'langchain';
import { z } from 'zod/v3';
import { mongoDb } from '../infra/mongodb';
import { User } from '../infra/models/user';
import { Theme } from '../infra/models/theme';
import { Context } from '../graphs/schemas';
import logger from '../logger';

type FinishedTheme = {
  themeId?: string;
  theme: string;
  lessonId?: string;
};

export function createAdvanceLearningTool() {
  return tool(
    async ({ userId, current, finalConsiderations }) => {
      try {
        logger.info({ userId, current, finalConsiderations }, 'INIT createAdvanceLearningTool')
        const newCompleted: FinishedTheme = {
          themeId: current.themeId,
          theme: current.theme!,
        };
        const [user] = await mongoDb.find<User[]>('users', { userId })
        const themes = await mongoDb.find<Theme[]>('themes', { lessonId: current.lessonId })

        const currentLesson = user.lessons?.find(le => le.lessonId === current.lessonId)

        // Nota curta do tema que acabou de ser concluído.
        const themeNote = {
          themeId: current.themeId,
          theme: current.theme,
          considerations: finalConsiderations,
        }

        const finishedThemes = user.lessons?.flatMap(le => le.themeIds)
        finishedThemes.push(current.themeId!)
        const unfinishedThemes = themes.filter(theme => !finishedThemes?.includes(theme.themeId))

        if (unfinishedThemes.length > 0) {
          await mongoDb.updateOne(`users`,
            {
              userId,
              "lessons.lessonId": current.lessonId,
            },
            {
              $addToSet: {
                "lessons.$.themeIds": current.themeId,
              },
              $push: {
                "lessons.$.themeConsiderations": themeNote,
              },
            }
          );

          return JSON.stringify({
            completed: newCompleted,
            plannerLogic: 'theme_completed',
            status: "completed"
          });
        }

        newCompleted.lessonId = current.lessonId

        const allNotes = [...(currentLesson?.themeConsiderations ?? []), themeNote]
        const lessonFinalConsiderations = allNotes
          .map(note => `${note.theme ?? 'Tema'}: ${note.considerations}`)
          .join('\n')

        await mongoDb.updateOne('users',
          {
            userId,
            "lessons.lessonId": current.lessonId,
          },
          {
            $addToSet: {
              "lessons.$.themeIds": current.themeId,
            },
            $push: {
              "lessons.$.themeConsiderations": themeNote,
            },
            $set: {
              "lessons.$.finalConsiderations": lessonFinalConsiderations,
            },
          }
        );

        return JSON.stringify({
          status: "completed",
          completed: newCompleted,
          plannerLogic: 'lesson_completed',
        })
      } catch (error: any) {
        logger.error(error, 'ERROR on advance_leaning')
        return JSON.stringify({
          status: 'error',
          error
        });
      }
    },
    {
      name: 'advance_learning',
      description: `
        Advances the student's learning progression after the planner determines that the current theme is complete.
      `,
      schema: z.object({
        userId: z.string(),
        current: Context,
        finalConsiderations: z.string(),
      }),
    }
  );
}
