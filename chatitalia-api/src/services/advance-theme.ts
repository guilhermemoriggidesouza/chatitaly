import { Datastore } from '../infra/mongodb';

type CurrentCtx = { userId?: string; lessonId?: string; themeId?: string; theme?: string };

export type AdvanceResult = {
  status: 'completed';
  plannerLogic: 'theme_completed' | 'lesson_completed';
  completed: { themeId?: string; theme?: string; lessonId?: string };
};

/**
 * Marca o tema atual como concluído para o usuário:
 *  - adiciona o themeId em lessons.$.themeIds
 *  - guarda uma nota curta (considerations) em lessons.$.themeConsiderations
 *  - se era o último tema da lição, monta o resumo em lessons.$.finalConsiderations
 * (era a tool `advance_learning`, agora é service).
 */
export async function advanceTheme(
  db: Datastore,
  current: CurrentCtx,
  considerations: string,
): Promise<AdvanceResult> {
  const { userId, lessonId, themeId, theme } = current;

  const [user] = await db.find<any[]>('users', { userId });
  const themes = await db.find<any[]>('themes', { lessonId });
  const currentLesson = user?.lessons?.find((le: any) => le.lessonId === lessonId);

  const themeNote = { themeId, theme, considerations };

  const finishedThemeIds: string[] = (user?.lessons ?? []).flatMap((le: any) => le.themeIds ?? []);
  finishedThemeIds.push(themeId as string);
  const remaining = (themes ?? []).filter((t: any) => !finishedThemeIds.includes(t.themeId));

  const filter = { userId, 'lessons.lessonId': lessonId };

  if (remaining.length > 0) {
    await db.updateOne('users', filter, {
      $addToSet: { 'lessons.$.themeIds': themeId },
      $push: { 'lessons.$.themeConsiderations': themeNote },
    });
    return {
      status: 'completed',
      plannerLogic: 'theme_completed',
      completed: { themeId, theme },
    };
  }

  const allNotes = [...(currentLesson?.themeConsiderations ?? []), themeNote];
  const lessonFinalConsiderations = allNotes
    .map((note: any) => `${note.theme ?? 'Tema'}: ${note.considerations}`)
    .join('\n');

  await db.updateOne('users', filter, {
    $addToSet: { 'lessons.$.themeIds': themeId },
    $push: { 'lessons.$.themeConsiderations': themeNote },
    $set: { 'lessons.$.finalConsiderations': lessonFinalConsiderations },
  });

  return {
    status: 'completed',
    plannerLogic: 'lesson_completed',
    completed: { themeId, theme, lessonId },
  };
}
