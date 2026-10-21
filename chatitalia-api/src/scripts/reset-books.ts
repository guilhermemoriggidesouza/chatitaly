import 'dotenv/config';
import { mongoDb } from '../infra/mongodb';

// Apaga TODOS os livros, lições e temas e tira o livro/progresso dos usuários
// (bookId e lessons). Contas, premium e WhatsApp continuam.
// Use antes de cadastrar um livro novo do zero: o nível do livro vem da ordem
// de cadastro (1º = A1/A2), então o antigo precisa sair antes do upload.
// Depois do upload: npm run users:assign-book.
//
// Sem --apply só mostra o que faria.
//   local: npm run books:reset [-- --apply]
//   prod:  npm run books:reset:prod [-- --apply]
const APPLY = process.argv.includes('--apply');

(async () => {
  await mongoDb.connect();
  try {
    const database = process.env.MONGODB_DB_NAME || 'chatitalia';
    const host = (process.env.MONGODB_URI || '').replace(/^.*@/, '').replace(/[/?].*$/, '') || 'localhost';
    console.log(`banco: ${host}/${database} | ${APPLY ? 'APLICANDO' : 'simulação (use --apply)'}`);

    const books = await mongoDb.find<any[]>('books', {});
    const lessons = await mongoDb.find<any[]>('lessons', {});
    const themes = await mongoDb.find<any[]>('themes', {});
    const users = await mongoDb.find<any[]>('users', {});
    const withProgress = users.filter((u) => (u.lessons || []).some((l: any) => l.themeIds?.length || l.finalConsiderations));

    console.log(`livros: ${books.map((b) => b.fileName).join(', ') || '—'}`);
    console.log(`apagar: ${books.length} livro(s), ${lessons.length} lições, ${themes.length} temas`);
    console.log(`limpar livro/progresso de ${users.length} usuário(s); com progresso: ${withProgress.map((u) => u.name || u.userId).join(', ') || 'nenhum'}`);

    if (!APPLY) return;

    await mongoDb.deleteMany('themes', {});
    await mongoDb.deleteMany('lessons', {});
    await mongoDb.deleteMany('books', {});
    await mongoDb.updateMany('users', {}, { $set: { lessons: [] }, $unset: { bookId: '' } });
    console.log('feito. Agora cadastre o livro novo em /upload e rode users:assign-book.');
  } finally {
    await mongoDb.disconnect();
  }
})();
