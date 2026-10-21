import { mongoDb } from '../infra/mongodb';

// Rótulo e níveis por posição: 1º livro = nível A, 2º = B, 3º = C.
export const BOOK_LEVEL_GROUPS = [
  { label: 'A1 e A2', levels: ['A1', 'A2'] },
  { label: 'B1 e B2', levels: ['B1', 'B2'] },
  { label: 'C1 e C2', levels: ['C1', 'C2'] },
];

// Livros na ordem que define o nível (criação), no máximo um por grupo.
export async function orderedBooks(): Promise<any[]> {
  const books = await mongoDb.find<any[]>('books', {});
  return books
    .slice()
    .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
    .slice(0, BOOK_LEVEL_GROUPS.length);
}

// Níveis cobertos pelo livro (ex.: ['A1', 'A2']); [] se não achar.
export async function levelsForBook(bookId?: string): Promise<string[]> {
  if (!bookId) return [];
  const index = (await orderedBooks()).findIndex((book) => book.bookId === bookId);
  return BOOK_LEVEL_GROUPS[index]?.levels ?? [];
}
