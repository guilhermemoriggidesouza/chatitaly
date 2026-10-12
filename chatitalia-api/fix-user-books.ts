import { config } from 'dotenv'; config({ path: '.env.prod' });
import { MongoClient } from 'mongodb';
import { writeFileSync } from 'node:fs';

// Associa o livro de produção (e as lições dele) a quem ficou sem lições por
// causa do bookId fixo do webhook. Não toca em quem já tem lições.
//   simulação: npx ts-node --transpile-only fix-user-books.ts
//   aplicar:   npx ts-node --transpile-only fix-user-books.ts --apply
const APPLY = process.argv.includes('--apply');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI!); await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'chatitalia');
  const users = db.collection('users');

  const books = (await db.collection('books').find({}).toArray())
    .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
  if (!books.length) throw new Error('nenhum livro em produção');
  const book = books[0];
  const lessons = (await db.collection('lessons').find({ bookId: book.bookId }).toArray())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const validBookIds = books.map((b) => b.bookId);
  console.log(`modo: ${APPLY ? 'APLICAR' : 'simulação'} | livro: ${book.bookId} (${lessons.length} lições)`);

  const all = await users.find({}).toArray();
  const broken = all.filter((u) => !validBookIds.includes(u.bookId) || !(u.lessons ?? []).length);
  console.log(`usuários: ${all.length} | sem livro válido ou sem lições: ${broken.length} | não mexo em: ${all.length - broken.length}`);

  if (APPLY) {
    const file = `/Users/guilhermemoriggi/Downloads/chatitalia-users-backup-antes-do-livro-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    writeFileSync(file, JSON.stringify(all, null, 2));
    console.log(`backup: ${file}`);
  }

  for (const user of broken) {
    const progress = (user.lessons ?? []).reduce((n: number, l: any) => n + (l.themeIds?.length ?? 0), 0);
    if (progress > 0) { console.log(` ! ${user.name}: tem progresso (${progress} temas), não mexi`); continue; }
    const label = `${String(user.name ?? '').split(' ')[0]} (${String(user.userId).slice(0, 13)}…) livro ${String(user.bookId ?? '—').slice(0, 8)} -> ${String(book.bookId).slice(0, 8)}, ${lessons.length} lições`;
    if (!APPLY) { console.log(` - ${label}`); continue; }
    const result = await users.updateOne({ _id: user._id }, {
      $set: {
        bookId: book.bookId,
        lessons: lessons.map((lesson) => ({ name: lesson.title, lessonId: lesson.lessonId, themeIds: [] })),
      },
    });
    console.log(` - ${label} | atualizado: ${result.modifiedCount}`);
  }

  if (APPLY) {
    const after = await users.find({}).toArray();
    console.log(`conferência -> com livro válido e lições: ${after.filter((u) => validBookIds.includes(u.bookId) && (u.lessons ?? []).length).length} de ${after.length}`);
  }
  await client.close();
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
