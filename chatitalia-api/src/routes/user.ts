import express, { Request, Response } from 'express';
import { mongoDb } from '../infra/mongodb';
import { Lesson } from '../infra/models/lesson';
import { Lesson as lessonUser } from '../infra/models/user';

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
    res.status(201)

})
router.get('/:userId', async (req: Request, res: Response) => {
    const user = await mongoDb.findOne('users', {
        userId: req.params.userId,
    })
    res.send(user)
})

// Refazer lição: limpa as considerações finais e o progresso de temas
// da lição para aquele usuário, deixando-a disponível para ser refeita.
router.post('/:userId/lessons/:lessonId/reset', async (req: Request, res: Response) => {
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
