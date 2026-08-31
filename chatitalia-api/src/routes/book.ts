import express, { Request, Response } from 'express';
import { mongoDb } from '../infra/mongodb';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Rótulo por posição: 1º livro = nível A, 2º = B, 3º = C.
const GROUPS = [
  { label: 'A1 e A2', levels: ['A1', 'A2'] },
  { label: 'B1 e B2', levels: ['B1', 'B2'] },
  { label: 'C1 e C2', levels: ['C1', 'C2'] },
];

// Lista os livros disponíveis (sempre até 3), ordenados por criação.
router.get('/', requireAuth(), async (_req: Request, res: Response) => {
  const books = await mongoDb.find<any[]>('books', {});

  const ordered = books
    .slice()
    .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
    .slice(0, GROUPS.length)
    .map((book, index) => ({
      bookId: book.bookId,
      fileName: book.fileName ?? null,
      order: index,
      label: GROUPS[index]?.label ?? `Livro ${index + 1}`,
      levels: GROUPS[index]?.levels ?? [],
    }));

  res.json({ books: ordered });
});

export default router;
