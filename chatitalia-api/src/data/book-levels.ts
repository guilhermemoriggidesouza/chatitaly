import { mongoDb } from '../infra/mongodb';

// Um livro por nível, pela ordem de cadastro: 1º livro = A1, 2º = A2, 3º = B1,
// 4º = B2, 5º = C1, 6º = C2.
export const BOOK_LEVEL_GROUPS = [
  { label: 'A1', levels: ['A1'] },
  { label: 'A2', levels: ['A2'] },
  { label: 'B1', levels: ['B1'] },
  { label: 'B2', levels: ['B2'] },
  { label: 'C1', levels: ['C1'] },
  { label: 'C2', levels: ['C2'] },
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
