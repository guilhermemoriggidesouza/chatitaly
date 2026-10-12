import { config } from 'dotenv'; config({ path: '.env.prod' });
import { MongoClient } from 'mongodb';
import { readFileSync, writeFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const CSV = '/Users/guilhermemoriggi/Downloads/ins_3IEGWYKcYodx0hLVqcVRtkAXDqj.csv';
const OUT = '/Users/guilhermemoriggi/Downloads';
const KEY = (process.env.CLERK_SECRET_KEY || '').trim();
const mask = (e: string) => (e.includes('@') ? `${e.slice(0, 2)}…@${e.split('@')[1]}` : e);

// CSV simples com aspas
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

async function clerk(method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

(async () => {
  if (!KEY.startsWith('sk_live_')) throw new Error('CLERK_SECRET_KEY do .env.prod não é sk_live');
  const rows = parseCsv(readFileSync(CSV, 'utf8'));
  const client = new MongoClient(process.env.MONGODB_URI!); await client.connect();
  const users = client.db(process.env.MONGODB_DB_NAME || 'chatitalia').collection('users');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  console.log(`modo: ${APPLY ? 'APLICAR' : 'simulação'} | usuários no CSV: ${rows.length}`);
  if (APPLY) {
    const all = await users.find({}).toArray();
    writeFileSync(`${OUT}/chatitalia-users-backup-${stamp}.json`, JSON.stringify(all, null, 2));
    console.log(`backup: ${OUT}/chatitalia-users-backup-${stamp}.json (${all.length} documentos)`);
  }

  const mapping: { email: string; oldId: string; newId: string }[] = [];
  let failed = 0;
  for (const row of rows) {
    const email = row.primary_email_address; const oldId = row.id;
    const inMongo = await users.countDocuments({ userId: oldId });
    const hasPassword = Boolean(row.password_digest);
    if (!APPLY) { console.log(` - ${mask(email)} | ${hasPassword ? 'com senha' : 'sem senha'} | documentos no Mongo: ${inMongo}`); continue; }

    // Idempotente: se já existe na produção (execução repetida), reaproveita.
    const found = await clerk('GET', `/users?email_address=${encodeURIComponent(email)}`);
    let newId: string | undefined = Array.isArray(found.json) ? found.json[0]?.id : undefined;
    if (!newId) {
      const created = await clerk('POST', '/users', {
        email_address: [email],
        ...(row.first_name ? { first_name: row.first_name } : {}),
        ...(row.last_name ? { last_name: row.last_name } : {}),
        ...(row.username ? { username: row.username } : {}),
        ...(hasPassword
          ? { password_digest: row.password_digest, password_hasher: row.password_hasher || 'bcrypt' }
          : { skip_password_requirement: true }),
        external_id: oldId,
      });
      if (!created.ok) { failed++; console.log(` ! ${mask(email)}: Clerk ${created.status} ${JSON.stringify(created.json?.errors?.map((e: any) => e.long_message || e.message))}`); continue; }
      newId = created.json.id;
    }

    // Se o webhook já criou um documento com o id novo, não mexe e avisa.
    if (await users.countDocuments({ userId: newId })) { failed++; console.log(` ! ${mask(email)}: já existe documento no Mongo com o id novo, não troquei`); mapping.push({ email, oldId, newId: newId! }); continue; }
    const result = await users.updateOne({ userId: oldId }, { $set: { userId: newId } });
    mapping.push({ email, oldId, newId: newId! });
    console.log(` - ${mask(email)}: ${oldId.slice(0, 12)}… -> ${newId!.slice(0, 12)}… | Mongo atualizado: ${result.modifiedCount}`);
  }

  if (APPLY) {
    writeFileSync(`${OUT}/chatitalia-clerk-id-mapping-${stamp}.json`, JSON.stringify(mapping, null, 2));
    const newIds = mapping.map((m) => m.newId); const oldIds = rows.map((r) => r.id);
    const count = await clerk('GET', '/users/count');
    console.log(`mapa de ids: ${OUT}/chatitalia-clerk-id-mapping-${stamp}.json`);
    console.log(`conferência -> Clerk produção: ${count.json?.total_count} usuários | Mongo com id novo: ${await users.countDocuments({ userId: { $in: newIds } })} | Mongo ainda com id antigo: ${await users.countDocuments({ userId: { $in: oldIds } })} | total no Mongo: ${await users.countDocuments({})} | falhas: ${failed}`);
  }
  await client.close();
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
