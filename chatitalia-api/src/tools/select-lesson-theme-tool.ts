import { tool } from 'langchain';
import { z } from 'zod/v3';
import { mongoDb } from '../infra/mongodb';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger';
import { User } from '../infra/models/user';
import { Context } from '../graphs/schemas';

type ThemeDocument = {
  _id: unknown;
  theme?: string;
  themeId?: string;
};

export function selectThemeByLesson() {
  return tool(
    async ({ current }) => {
      const themes = await mongoDb.find('themes', { lessonId: current.lessonId }) as ThemeDocument[];
      const [user] = await mongoDb.find<User[]>('users', { userId: current.userId })
      const userThemeInLesson = user.lessons.find(le => le.lessonId == current.lessonId)?.themeIds
      const unfinishedLessons = themes.filter(theme => !userThemeInLesson!.includes(theme.themeId!))

      const selectedTheme = unfinishedLessons.find((theme) => theme.theme);

      if (!selectedTheme?.theme) {
        throw new Error("Erro ao selecionar um novo tema")
      }

      return JSON.stringify({ current: { ...current, theme: selectedTheme.theme, themeId: selectedTheme.themeId } });
    },
    {
      name: 'select_theme_for_lesson',
      description: 'Selects a theme from MongoDB for the provided lessonId. Use this when lessonId exists and themeId is missing.',
      schema: z.object({
        current: Context,
      }),
    })
}