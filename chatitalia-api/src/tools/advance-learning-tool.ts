import { tool } from 'langchain';
import { z } from 'zod/v3';
import { mongoDb } from '../infra/mongodb';
import { Lesson, User } from '../infra/models/user';
import { Theme } from '../infra/models/theme';
import { Context } from '../graphs/schemas';

type FinishedTheme = {
  themeId?: string;
  theme: string;
  lessonId?: string;
};

export function createAdvanceLearningTool() {
  return tool(
    async ({ userId, current, finalConsiderations }) => {
      const newCompleted: FinishedTheme = {
        themeId: current.themeId,
        theme: current.theme!,
      };
      const [user] = await mongoDb.find<User[]>('users', { userId })
      const themes = await mongoDb.find<Theme[]>('themes', { lessonId: current.lessonId })

      const finishedThemes = user?.lessons.flatMap(le => le.themeIds)
      const unfinishedThemes = themes.filter(theme => !finishedThemes.includes(theme.themeId))

      if (unfinishedThemes.length > 0) {
        await mongoDb.updateOne(`user`,
          {
            userId,
            "lessons.lessonId": current.lessonId,
          },
          {
            $push: {
              "lessons.$.themeIds": current.themeId,
            },
          }
        );

        return JSON.stringify({
          completed: newCompleted,
          plannerLogic: 'theme_completed',
        });
      }

      const lessons = await mongoDb.find<Lesson[]>(`lessons`, { bookId: current.bookId })
      const finishedLessonIds = user.lessons.map(lesson => lesson.lessonId)
      const unfinishedLessons = lessons.filter(lesson => !finishedLessonIds.includes(lesson.lessonId))
      const nextLesson = unfinishedLessons[0]
      newCompleted.lessonId = current.lessonId

      await mongoDb.updateOne('users',
        {
          userId,
          "lessons.lessonId": current.lessonId,
        },
        {
          $addToSet: {
            "lessons.$.themes": current.theme,
          },
          $set: {
            "lessons.$.finalConsiderations": finalConsiderations,
          },
          $push: {
            lessons: {
              lessonId: nextLesson.lessonId,
              name: nextLesson.name,
              themes: [],
            },
          },
        }
      );
      return JSON.stringify({
        completed: newCompleted,
        plannerLogic: 'lesson_completed',
        current: {
          ...current,
          lessonId: nextLesson.lessonId
        }
      })
    },
    {
      name: 'advance_learning',
      description: 'Advances learning progression after the planner determines the theme is complete.',
      schema: z.object({
        userId: z.string(),
        current: Context,
        finalConsiderations: z.string(),
      }),
    }
  );
}
