import { tool } from 'langchain';
import { z } from 'zod/v3';
import { mongoDb } from '../infra/mongodb';
import logger from '../logger';

type ThemeDocument = {
  themeId: string;
  lessonId: string;
  level: string;
  theme: string;
  createdAt?: string;
};

type FinishedTheme = {
  themeId?: string;
  theme: string;
  lessonId: string;
  level: string;
  considerations: string;
};

type UserProgress = {
  userId: string;
  finishedThemes?: FinishedTheme[];
};

export function createAdvanceLearningTool() {
	return tool(
		async ({ userId, finalConsiderations, lessonId, themeId, theme }) => {
			const currentTheme = await mongoDb.findOne('themes', { themeId, lessonId }) as ThemeDocument | null;
			if (!currentTheme) {
				throw new Error(`Current theme ${themeId} was not found in lesson ${lessonId}`);
			}

			const user = await mongoDb.findOne('users', { userId }) as UserProgress | null;
			const finishedThemes = user?.finishedThemes ?? [];
			const completedTheme: FinishedTheme = {
				themeId: currentTheme.themeId,
				theme: currentTheme.theme,
				lessonId: currentTheme.lessonId,
				level: currentTheme.level,
				considerations: finalConsiderations,
			};
			const nextFinishedThemes = finishedThemes.some((item) => item.themeId === currentTheme.themeId)
				? finishedThemes
				: [...finishedThemes, completedTheme];
			const completedThemeIds = new Set(nextFinishedThemes.map((item) => item.themeId));

			const themesInLevel = (await mongoDb.find('themes', { level: currentTheme.level }) as unknown as ThemeDocument[])
				.sort((first, second) => (first.createdAt ?? '').localeCompare(second.createdAt ?? ''));
			const nextTheme = themesInLevel.find((item) =>
				item.lessonId === currentTheme.lessonId && !completedThemeIds.has(item.themeId)
			) ?? themesInLevel.find((item) => !completedThemeIds.has(item.themeId));

			const update = {
				finishedThemes: nextFinishedThemes,
				currentTheme: nextTheme?.theme ?? null,
				currentThemeId: nextTheme?.themeId ?? null,
				currentLessonId: nextTheme?.lessonId ?? null,
				level: nextTheme?.level ?? currentTheme.level,
			};

			if (user) {
				await mongoDb.updateOne('users', { userId }, update);
			} else {
				await mongoDb.insertOne('users', { userId, ...update });
			}

			const status = !nextTheme
				? 'course_completed'
				: nextTheme.lessonId === currentTheme.lessonId
					? 'theme_completed'
					: 'level_completed';

			logger.info(
				{ userId, completedThemeId: themeId, nextThemeId: nextTheme?.themeId, status },
				'Advanced learning progression with MongoDB'
			);

			return JSON.stringify({
				status,
				completed: {
					theme: currentTheme.theme,
					themeId: currentTheme.themeId,
					level: currentTheme.level,
					lessonId: currentTheme.lessonId,
					considerations: finalConsiderations,
				},
				level: nextTheme?.level ?? currentTheme.level,
				theme: nextTheme?.theme ?? null,
				themeId: nextTheme?.themeId ?? null,
				lessonId: nextTheme?.lessonId ?? null,
				message: nextTheme ? 'Progression advanced.' : 'Learning path completed.',
			});
		},
		{
			name: 'advance_learning',
			description: 'Advances learning progression after the planner determines the theme is complete.',
			schema: z.object({
				userId: z.string(),
				finalConsiderations: z.string(),
				lessonId: z.string(),
				themeId: z.string(),
				theme: z.string(),
			}),
		}
	);
}
