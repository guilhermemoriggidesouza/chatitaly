import 'dotenv/config';
import { mongoDb } from '../infra/mongodb';

// Limpa um usuário no banco, pelo userId (o que chega nos avisos do WhatsApp).
//
//   Padrão — tira o premium: o usuário volta ao plano gratuito e o WhatsApp
//   é desligado (sem envios agendados e sem conversa com o Don). Lições,
//   progresso e a conta continuam.
//   --delete — apaga o usuário inteiro do banco (documento em `users` e as
//   conversas do WhatsApp). A conta no Clerk NÃO é apagada.
//
// Sem --apply só mostra o que faria.
//   local: npm run user:clean -- <userId> [--delete] [--apply]
//   prod:  npm run user:clean:prod -- <userId> [--delete] [--apply]
const args = process.argv.slice(2);
const userId = args.find((arg) => !arg.startsWith('--'));
const DELETE = args.includes('--delete');
const APPLY = args.includes('--apply');

// Campos do plano pago e do WhatsApp.
const PREMIUM_FIELDS = ['premium', 'premiumEnabledAt', 'premiumCancelRequest', 'whatsConfig', 'whatsLastSent'];

(async () => {
  if (!userId) {
    console.error('Uso: npm run user:clean -- <userId> [--delete] [--apply]');
    process.exit(1);
  }

  await mongoDb.connect();
  try {
    const database = process.env.MONGODB_DB_NAME || 'chatitalia';
    const host = (process.env.MONGODB_URI || '').replace(/^.*@/, '').replace(/[/?].*$/, '') || 'localhost';
    console.log(`banco: ${host}/${database} | modo: ${DELETE ? 'APAGAR o usuário' : 'tirar o premium'} | ${APPLY ? 'APLICANDO' : 'simulação (use --apply)'}`);

    const user = await mongoDb.findOne('users', { userId });
    if (!user) {
      console.log(`nenhum usuário com userId ${userId}`);
      return;
    }

    const conversations = await mongoDb.find<any[]>('whatsapp_conversations', { userId });
    const present = PREMIUM_FIELDS.filter((field) => user[field] !== undefined);
    console.log(`usuário: ${user.name || '(sem nome)'} | premium: ${Boolean(user.premium)} | WhatsApp: ${user.whatsConfig?.phone ? 'configurado' : 'não'} | conversas salvas: ${conversations.length}`);

    if (DELETE) {
      console.log(`vai apagar: o usuário e ${conversations.length} conversa(s) do WhatsApp`);
      if (!APPLY) return;
      await mongoDb.deleteOne('users', { userId });
      for (const conversation of conversations) {
        await mongoDb.deleteOne('whatsapp_conversations', { _id: conversation._id });
      }
      console.log('apagado.');
      return;
    }

    if (!present.length) {
      console.log('nada a limpar: o usuário já está no plano gratuito, sem WhatsApp.');
      return;
    }
    console.log(`vai remover os campos: ${present.join(', ')}`);
    if (!APPLY) return;
    await mongoDb.updateOne('users', { userId }, { $unset: Object.fromEntries(present.map((field) => [field, ''])) });
    console.log('feito: o usuário voltou ao plano gratuito.');
  } finally {
    await mongoDb.disconnect();
  }
})().catch((error) => {
  console.error('ERRO', error.message);
  process.exit(1);
});
