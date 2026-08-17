import { DynamicStructuredTool } from 'langchain';
import { z } from 'zod/v3';
import { mongoDb } from '../infra/mongodb';
import { v4 as uuidv4 } from 'uuid';

type ThemeDocument = {
  _id: unknown;
  theme?: string;
  themeId?: string;
};

export function createSelectLessonThemeTool() {
  return new DynamicStructuredTool({
    name: 'select_theme_for_lesson',
    description: 'Selects a theme from MongoDB for the provided lessonId. Use this when lessonId exists and themeId is missing.',
    schema: z.object({
      lessonId: z.string().min(1),
    }),
    func: async ({ lessonId }) => {
      const themes = await mongoDb.find('themes', { lessonId }) as ThemeDocument[];
      const selectedTheme = themes.find((theme) => theme.theme);

      if (!selectedTheme?.theme) {
        return JSON.stringify({ lessonId, themeId: null, theme: null });
      }

      const themeId = selectedTheme.themeId ?? uuidv4();
      if (!selectedTheme.themeId) {
        await mongoDb.updateOne('themes', { _id: selectedTheme._id }, { themeId });
      }

      return JSON.stringify({ lessonId, themeId, theme: selectedTheme.theme });
    },
  });
}