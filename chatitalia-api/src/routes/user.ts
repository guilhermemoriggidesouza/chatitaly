import express, { Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { mongoDb } from '../infra/mongodb';
import { Lesson } from '../infra/models/lesson';
import { Lesson as lessonUser } from '../infra/models/user';
import { requireAuth, requireSelf } from '../middleware/auth';
import logger from '../logger';

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
    const user = await mongoDb.findOne(`users`, { userId: req.body.data.id })
    const bookId = 'b03163d6-1b5f-4827-9f1d-c45f39c796d4'

    if (user) {
        res.status(400).send({ message: "user already saved" })
        return
    }
    const lessons = await mongoDb.find<Lesson[]>('lessons', {
        bookId: bookId
    })
    await mongoDb.insertOne('users', {
        userId: req.body.data.id,
        level: `A1`,
        name: `${req.body.data.first_name} ${req.body.data.last_name}`,
        bookId: bookId,
        lessons: lessons.map(lesson => ({ name: lesson.title, lessonId: lesson.lessonId, themeIds: [] } as lessonUser))
    })
    res.status(201).send({ success: true })

})
// Lições do usuário autenticado (com o progresso dele). O markdown de cada
// lição não vem aqui — é buscado sob demanda em GET /pdf/lessons/:lessonId.
router.get('/lessons', requireAuth(), async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req)
        const user = await mongoDb.findOne('users', { userId })

        if (!user) {
            res.status(404).json({ error: 'user not found' })
            return
        }

        const userLessonsById: Record<string, any> = Object.fromEntries(
            (user.lessons ?? []).map((lesson: any) => [lesson.lessonId, lesson])
        )
        const userLessonIds = Object.keys(userLessonsById)

        const lessons = await mongoDb.find<any[]>('lessons', {
            bookId: user.bookId,
            lessonId: { $in: userLessonIds },
        })

        // Todos os temas das lições do usuário, agrupados por lição.
        const allThemes = await mongoDb.find<any[]>('themes', {
            lessonId: { $in: userLessonIds },
        })
        const themesByLesson: Record<string, { themeId: string; theme: string }[]> = {}
        for (const theme of allThemes) {
            ;(themesByLesson[theme.lessonId] ??= []).push({ themeId: theme.themeId, theme: theme.theme })
        }

        const lessonsWithProgress = lessons.map((lesson: any) => {
            const { lessonContent, ...rest } = lesson
            const userLesson = userLessonsById[lesson.lessonId]
            const finalConsiderations = userLesson?.finalConsiderations ?? null

            const themes = themesByLesson[lesson.lessonId] ?? []
            const doneThemeIds: string[] = userLesson?.themeIds ?? []
            const themesDone = themes.filter((theme) => doneThemeIds.includes(theme.themeId))
            const themesRemaining = themes.filter((theme) => !doneThemeIds.includes(theme.themeId))

            return {
                ...rest,
                finalConsiderations,
                done: Boolean(finalConsiderations),
                themes,
                themesTotal: themes.length,
                themesDone,
                themesRemaining,
                themesDoneCount: themesDone.length,
                progress: themes.length ? themesDone.length / themes.length : 0,
            }
        })

        res.status(200).json({
            bookId: user.bookId,
            lessonsCount: lessonsWithProgress.length,
            lessons: lessonsWithProgress,
        })
    } catch (error: any) {
        logger.error({ error: error.message }, 'Error retrieving user lessons')
        res.status(500).json({ error: 'Error retrieving user lessons', detail: error.message })
    }
})

router.get('/:userId', requireAuth(), requireSelf('userId', 'params'), async (req: Request, res: Response) => {
    const user = await mongoDb.findOne('users', {
        userId: req.params.userId,
    })
    res.send(user)
})

// Refazer lição: limpa as considerações finais e o progresso de temas
// da lição para aquele usuário, deixando-a disponível para ser refeita.
router.post('/:userId/lessons/:lessonId/reset', requireAuth(), requireSelf('userId', 'params'), async (req: Request, res: Response) => {
    const { userId, lessonId } = req.params

    const result = await mongoDb.updateOne('users',
        {
            userId,
            'lessons.lessonId': lessonId,
        },
        {
            $set: { 'lessons.$.themeIds': [] },
            $unset: { 'lessons.$.finalConsiderations': '' },
        }
    )

    if (result.matchedCount === 0) {
        res.status(404).send({ message: 'lesson not found for user' })
        return
    }

    res.status(200).send({ userId, lessonId, reset: true })
})

export default router;
