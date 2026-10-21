import 'dotenv/config';
import { mongoDb } from '../infra/mongodb';
import { orderedBooks } from '../data/book-levels';

// Liga todos os usuários ao 1º livro (nível A) e às lições dele, com o
// progresso zerado. Use depois de books:reset + upload do livro novo.
// Usuários que já estão nesse livro não são tocados.
//
// Sem --apply só mostra o que faria.
//   local: npm run users:assign-book [-- --apply]
//   prod:  npm run users:assign-book:prod [-- --apply]
const APPLY = process.argv.includes('--apply');

(async () => {
  await mongoDb.connect();
  try {
    const database = process.env.MONGODB_DB_NAME || 'chatitalia';
    const host = (process.env.MONGODB_URI || '').replace(/^.*@/, '').replace(/[/?].*$/, '') || 'localhost';
    console.log(`banco: ${host}/${database} | ${APPLY ? 'APLICANDO' : 'simulação (use --apply)'}`);

    const [book] = await orderedBooks();
    if (!book) {
      console.log('nenhum livro cadastrado: faça o upload antes.');
      return;
    }
    const lessons = (await mongoDb.find<any[]>('lessons', { bookId: book.bookId }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const users = (await mongoDb.find<any[]>('users', {})).filter((u) => u.bookId !== book.bookId);

    console.log(`livro: ${book.fileName} (${lessons.length} lições) | usuários a ligar: ${users.length}`);
    if (!lessons.length) {
      console.log('o livro ainda não tem lições: espere o upload terminar de criar os capítulos.');
      return;
    }
    if (!APPLY) return;

    await mongoDb.updateMany('users', { userId: { $in: users.map((u) => u.userId) } }, {
      $set: {
        bookId: book.bookId,
        lessons: lessons.map((lesson) => ({ name: lesson.title, lessonId: lesson.lessonId, themeIds: [] })),
      },
    });
    console.log('feito.');
  } finally {
    await mongoDb.disconnect();
  }
})();
