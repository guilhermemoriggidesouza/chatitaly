import express, { Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { Webhook } from 'svix';
import { mongoDb } from '../infra/mongodb';
import { Lesson } from '../infra/models/lesson';
import { Lesson as lessonUser } from '../infra/models/user';
import { requireAuth, requireSelf } from '../middleware/auth';
import logger from '../logger';

const router = express.Router();

// Webhook do Clerk (evento `user.created`). Não tem sessão de usuário:
// a autenticidade é garantida pela assinatura Svix, verificada abaixo.
router.post('/create', async (req: Request, res: Response) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET
    if (!secret) {
        logger.error('CLERK_WEBHOOK_SECRET não configurado; recusando webhook.')
        res.status(500).send({ error: 'webhook not configured' })
        return
    }

    const payload = (req as any).rawBody
        ? (req as any).rawBody.toString('utf8')
        : JSON.stringify(req.body)

    let evt: any
    try {
        evt = new Webhook(secret).verify(payload, {
            'svix-id': req.header('svix-id') ?? '',
            'svix-timestamp': req.header('svix-timestamp') ?? '',
            'svix-signature': req.header('svix-signature') ?? '',
        })
    } catch (err: any) {
        logger.warn({ err: err?.message }, 'Webhook do Clerk com assinatura inválida')
        res.status(401).send({ error: 'invalid signature' })
        return
    }

    if (evt.type !== 'user.created') {
        res.status(200).send({ ignored: evt.type })
        return
    }

    const data = evt.data
    const bookId = 'b03163d6-1b5f-4827-9f1d-c45f39c796d4'

    const existing = await mongoDb.findOne('users', { userId: data.id })
    if (existing) {
        // 2xx para o Clerk não ficar reenviando o webhook.
        res.status(200).send({ message: 'user already saved' })
        return
    }

    const lessons = await mongoDb.find<Lesson[]>('lessons', { bookId })
    await mongoDb.insertOne('users', {
        userId: data.id,
        level: `A1`,
        name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
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
        // Ordena pela `order` da collection `lessons` (fonte da verdade). A
        // ordem do array `user.lessons` pode estar errada em usuários antigos.
        const orderedLessons = [...lessons].sort(
            (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
        )

        // Todos os temas das lições do usuário, agrupados por lição.
        const allThemes = await mongoDb.find<any[]>('themes', {
            lessonId: { $in: userLessonIds },
        })
        const themesByLesson: Record<string, { themeId: string; theme: string }[]> = {}
        for (const theme of allThemes) {
            ;(themesByLesson[theme.lessonId] ??= []).push({ themeId: theme.themeId, theme: theme.theme })
        }

        const lessonsWithProgress = orderedLessons.map((lesson: any) => {
            const { lessonContent, ...rest } = lesson // `rest` já carrega `order`
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
    if (!user) {
        res.status(404).json({ error: 'user not found' })
        return
    }
    res.json(user)
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

// Troca o livro do usuário: LIMPA todas as lições/progresso atuais e recria
// a lista de lições a partir do livro escolhido (todo o progresso é perdido).
router.post('/:userId/book', requireAuth(), requireSelf('userId', 'params'), async (req: Request, res: Response) => {
    const { userId } = req.params
    const bookId = String(req.body?.bookId ?? '')

    if (!bookId) {
        res.status(400).send({ message: 'bookId is required' })
        return
    }

    const book = await mongoDb.findOne('books', { bookId })
    if (!book) {
        res.status(404).send({ message: 'book not found' })
        return
    }

    const lessons = await mongoDb.find<Lesson[]>('lessons', { bookId })

    const result = await mongoDb.updateOne('users',
        { userId },
        {
            $set: {
                bookId,
                lessons: lessons.map(lesson => ({
                    name: lesson.title,
                    lessonId: lesson.lessonId,
                    themeIds: [],
                } as lessonUser)),
            },
        }
    )

    if (result.matchedCount === 0) {
        res.status(404).send({ message: 'user not found' })
        return
    }

    res.status(200).send({ userId, bookId, lessonsCount: lessons.length })
})

export default router;
