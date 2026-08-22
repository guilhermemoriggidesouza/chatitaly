import express, { Request, Response } from 'express';
import { mongoDb } from '../infra/mongodb';

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
    const user = await mongoDb.findOne(`users`, { userId: req.body.data.id })

    if (user) {
        res.status(400).send({ message: "user already saved" })
    }

    await mongoDb.insertOne('users', {
        userId: req.body.data.id,
        level: `A1`,
        name: `${req.body.data.first_name} ${req.body.data.last_name}`,
        bookId: ``,
        lessons: {}
    })
    res.status(201)

})
router.get('/:userId', async (req: Request, res: Response) => {
    const user = await mongoDb.findOne('users', {
        userId: req.params.userId,
    })
    res.send(user)
})

export default router;
