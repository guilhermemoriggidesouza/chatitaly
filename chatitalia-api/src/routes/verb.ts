import express, { Request, Response } from 'express';
import { mongoDb } from '../infra/mongodb';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Verbos regulares da página de conjugação, em ordem alfabética. A
// conjugação é montada no front (radical + terminação), aqui vai só o cadastro.
router.get('/', requireAuth(), async (_req: Request, res: Response) => {
  const verbs = await mongoDb.find<any[]>('verbs', {});

  const ordered = verbs
    .slice()
    .sort((a, b) => String(a.infinitive ?? '').localeCompare(String(b.infinitive ?? ''), 'it'))
    .map((verb) => ({
      verbId: verb.verbId,
      infinitive: verb.infinitive,
      translation: verb.translation,
      auxiliary: verb.auxiliary,
      isc: Boolean(verb.isc),
    }));

  res.json({ verbs: ordered });
});

// Um verbo pelo infinitivo. SEM login: é o que a página do cartão
// (/verbs/card?verb=parlare) usa, e ela precisa abrir pra quem não tem
// conta e pra ferramenta que gera a imagem enviada no WhatsApp.
router.get('/:infinitive', async (req: Request, res: Response) => {
  const infinitive = String(req.params.infinitive ?? '').trim().toLowerCase();
  const verb = await mongoDb.findOne('verbs', { infinitive });

  if (!verb) {
    res.status(404).json({ error: 'verb not found' });
    return;
  }

  res.json({
    verbId: verb.verbId,
    infinitive: verb.infinitive,
    translation: verb.translation,
    auxiliary: verb.auxiliary,
    isc: Boolean(verb.isc),
  });
});

export default router;
