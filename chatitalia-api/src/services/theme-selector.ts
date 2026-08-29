import { Datastore } from '../infra/mongodb';
import { ContextState } from '../graphs/schemas';

type ThemeDoc = { themeId?: string; theme?: string };

export type SelectedTheme = {
  lessonId?: string;
  lesson?: string;
  themeId?: string;
  theme?: string;
};

/**
 * Escolhe o próximo tema para o usuário:
 *  - o primeiro tema da lição atual que ele ainda não concluiu;
 *  - se todos os temas da lição estiverem concluídos, a primeira lição sem
 *    `finalConsiderations` e o primeiro tema dela.
 * Retorna null quando não há como decidir (sem lessonId, sem user, sem temas).
 */
export async function selectNextTheme(
  db: Datastore,
  current: Pick<ContextState, 'lessonId' | 'userId'>,
): Promise<SelectedTheme | null> {
  const { lessonId, userId } = current;
  if (!lessonId) return null;

  const themesFromThisLesson = await db.find<ThemeDoc[]>('themes', { lessonId });
  const [user] = await db.find<any[]>('users', { userId });
  if (!user) return null;

  const currentLesson = user.lessons?.find((le: any) => le.lessonId === lessonId);
  const userThemeInLesson: string[] = currentLesson?.themeIds ?? [];
  const unfinishedThemes = (themesFromThisLesson ?? []).filter(
    (theme) => !userThemeInLesson.includes(theme.themeId!),
  );

  if (unfinishedThemes.length === 0) {
    const [nextLesson] = (user.lessons ?? []).filter((le: any) => !le.finalConsiderations);
    if (!nextLesson) return null;
    const [nextTheme] = await db.find<ThemeDoc[]>('themes', { lessonId: nextLesson.lessonId });
    if (!nextTheme) return null;
    return {
      lessonId: nextLesson.lessonId,
      lesson: nextLesson.name,
      themeId: nextTheme.themeId,
      theme: nextTheme.theme,
    };
  }

  const selectedTheme = unfinishedThemes.find((theme) => theme.theme);
  if (!selectedTheme) return null;
  return {
    lesson: currentLesson?.name,
    themeId: selectedTheme.themeId,
    theme: selectedTheme.theme,
  };
}
