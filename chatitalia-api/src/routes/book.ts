import express, { Request, Response } from 'express';
import { BOOK_LEVEL_GROUPS, orderedBooks } from '../data/book-levels';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Lista os livros disponíveis (até 6, um por nível), ordenados por criação.
router.get('/', requireAuth(), async (_req: Request, res: Response) => {
  const ordered = (await orderedBooks()).map((book, index) => ({
    bookId: book.bookId,
    fileName: book.fileName ?? null,
    order: index,
    label: BOOK_LEVEL_GROUPS[index]?.label ?? `Livro ${index + 1}`,
    levels: BOOK_LEVEL_GROUPS[index]?.levels ?? [],
  }));

  res.json({ books: ordered });
});

export default router;
