import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { VERBS_SEED } from '../data/verbs-seed';
import { mongoDb } from '../infra/mongodb';
import logger from '../logger';

// Insere na collection `verbs` os verbos de data/verbs-seed.ts que ainda não
// existem (pelo infinitivo). Não altera nem apaga os que já estão no banco,
// então pode rodar quantas vezes quiser.
//   local:    npm run verbs:seed
//   produção: docker compose -f docker-compose.prod.yml exec api node dist/scripts/seed-verbs.js
async function seedVerbs() {
  await mongoDb.connect();

  let inserted = 0;
  try {
    for (const verb of VERBS_SEED) {
      const infinitive = verb.infinitive.trim().toLowerCase();
      const existing = await mongoDb.findOne('verbs', { infinitive });
      if (existing) continue;

      await mongoDb.insertOne('verbs', {
        verbId: uuidv4(),
        infinitive,
        translation: verb.translation,
        auxiliary: verb.auxiliary,
        isc: Boolean(verb.isc),
        createdAt: new Date().toISOString(),
      });
      inserted++;
    }
  } finally {
    await mongoDb.disconnect();
  }

  logger.info({ inserted, total: VERBS_SEED.length }, 'Seed de verbos concluído');
}

seedVerbs().catch((error) => {
  logger.error({ error: error.message }, 'Seed de verbos falhou');
  process.exit(1);
});
