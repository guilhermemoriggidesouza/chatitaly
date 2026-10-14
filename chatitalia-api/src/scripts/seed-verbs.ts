import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { VERBS_SEED } from '../data/verbs-seed';
import { mongoDb } from '../infra/mongodb';
import logger from '../logger';

// Sincroniza a collection `verbs` com data/verbs-seed.ts: insere os verbos
// que ainda não existem (pelo infinitivo) e grava em todos o campo `order`,
// que é a posição na lista (do mais usado para o menos usado). Não apaga
// nada nem mexe nos outros campos dos que já existem, então pode rodar
// quantas vezes quiser.
//   local:    npm run verbs:seed
//   produção: docker compose -f docker-compose.prod.yml exec api node dist/scripts/seed-verbs.js
async function seedVerbs() {
  await mongoDb.connect();

  let inserted = 0;
  let reordered = 0;
  try {
    for (const [order, verb] of VERBS_SEED.entries()) {
      const infinitive = verb.infinitive.trim().toLowerCase();
      const existing = await mongoDb.findOne('verbs', { infinitive });
      if (existing) {
        if (existing.order !== order) {
          await mongoDb.updateOne('verbs', { infinitive }, { $set: { order } });
          reordered++;
        }
        continue;
      }

      await mongoDb.insertOne('verbs', {
        verbId: uuidv4(),
        infinitive,
        translation: verb.translation,
        auxiliary: verb.auxiliary,
        isc: Boolean(verb.isc),
        order,
        createdAt: new Date().toISOString(),
      });
      inserted++;
    }
  } finally {
    await mongoDb.disconnect();
  }

  logger.info({ inserted, reordered, total: VERBS_SEED.length }, 'Seed de verbos concluído');
}

seedVerbs().catch((error) => {
  logger.error({ error: error.message }, 'Seed de verbos falhou');
  process.exit(1);
});
