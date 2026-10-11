import { Verb } from '../infra/models/verb';

type VerbSeed = Pick<Verb, 'infinitive' | 'translation' | 'auxiliary'> & { isc?: boolean };

// Lista inicial da página de conjugação. Só verbos TOTALMENTE regulares:
// nada de particípio irregular (aprire -> aperto), futuro contraído
// (godere -> godrò) nem ajuste de grafia (-care/-gare/-iare: cercare ->
// cerchi, studiare -> studi), porque o front conjuga por regra fixa.
// Pra adicionar verbos: inclua aqui e rode `npm run verbs:seed`.
export const VERBS_SEED: VerbSeed[] = [
  // -are
  { infinitive: 'parlare', translation: 'falar', auxiliary: 'avere' },
  { infinitive: 'lavorare', translation: 'trabalhar', auxiliary: 'avere' },
  { infinitive: 'comprare', translation: 'comprar', auxiliary: 'avere' },
  { infinitive: 'guardare', translation: 'olhar, assistir', auxiliary: 'avere' },
  { infinitive: 'ascoltare', translation: 'escutar', auxiliary: 'avere' },
  { infinitive: 'amare', translation: 'amar', auxiliary: 'avere' },
  { infinitive: 'cantare', translation: 'cantar', auxiliary: 'avere' },
  { infinitive: 'ballare', translation: 'dançar', auxiliary: 'avere' },
  { infinitive: 'abitare', translation: 'morar', auxiliary: 'avere' },
  { infinitive: 'aspettare', translation: 'esperar', auxiliary: 'avere' },
  { infinitive: 'imparare', translation: 'aprender', auxiliary: 'avere' },
  { infinitive: 'camminare', translation: 'caminhar', auxiliary: 'avere' },
  { infinitive: 'cucinare', translation: 'cozinhar', auxiliary: 'avere' },
  { infinitive: 'lavare', translation: 'lavar', auxiliary: 'avere' },
  { infinitive: 'portare', translation: 'levar, trazer', auxiliary: 'avere' },
  { infinitive: 'trovare', translation: 'encontrar, achar', auxiliary: 'avere' },
  { infinitive: 'pensare', translation: 'pensar', auxiliary: 'avere' },
  { infinitive: 'chiamare', translation: 'chamar', auxiliary: 'avere' },
  { infinitive: 'aiutare', translation: 'ajudar', auxiliary: 'avere' },
  { infinitive: 'usare', translation: 'usar', auxiliary: 'avere' },
  { infinitive: 'preparare', translation: 'preparar', auxiliary: 'avere' },
  { infinitive: 'visitare', translation: 'visitar', auxiliary: 'avere' },
  { infinitive: 'ricordare', translation: 'lembrar', auxiliary: 'avere' },
  { infinitive: 'salutare', translation: 'cumprimentar', auxiliary: 'avere' },
  { infinitive: 'telefonare', translation: 'telefonar', auxiliary: 'avere' },
  { infinitive: 'domandare', translation: 'perguntar', auxiliary: 'avere' },
  { infinitive: 'incontrare', translation: 'encontrar (alguém)', auxiliary: 'avere' },
  { infinitive: 'guidare', translation: 'dirigir', auxiliary: 'avere' },
  { infinitive: 'nuotare', translation: 'nadar', auxiliary: 'avere' },
  { infinitive: 'suonare', translation: 'tocar (instrumento)', auxiliary: 'avere' },
  { infinitive: 'provare', translation: 'tentar, experimentar', auxiliary: 'avere' },
  { infinitive: 'mandare', translation: 'mandar, enviar', auxiliary: 'avere' },
  { infinitive: 'arrivare', translation: 'chegar', auxiliary: 'essere' },
  { infinitive: 'entrare', translation: 'entrar', auxiliary: 'essere' },
  { infinitive: 'tornare', translation: 'voltar', auxiliary: 'essere' },
  { infinitive: 'restare', translation: 'ficar', auxiliary: 'essere' },
  { infinitive: 'diventare', translation: 'tornar-se', auxiliary: 'essere' },
  // -ere
  { infinitive: 'credere', translation: 'acreditar', auxiliary: 'avere' },
  { infinitive: 'vendere', translation: 'vender', auxiliary: 'avere' },
  { infinitive: 'ricevere', translation: 'receber', auxiliary: 'avere' },
  { infinitive: 'temere', translation: 'temer', auxiliary: 'avere' },
  { infinitive: 'ripetere', translation: 'repetir', auxiliary: 'avere' },
  { infinitive: 'battere', translation: 'bater', auxiliary: 'avere' },
  { infinitive: 'combattere', translation: 'combater, lutar', auxiliary: 'avere' },
  // -ire
  { infinitive: 'dormire', translation: 'dormir', auxiliary: 'avere' },
  { infinitive: 'sentire', translation: 'ouvir, sentir', auxiliary: 'avere' },
  { infinitive: 'seguire', translation: 'seguir', auxiliary: 'avere' },
  { infinitive: 'servire', translation: 'servir', auxiliary: 'avere' },
  { infinitive: 'vestire', translation: 'vestir', auxiliary: 'avere' },
  { infinitive: 'partire', translation: 'partir', auxiliary: 'essere' },
  // -ire com -isc-
  { infinitive: 'capire', translation: 'entender', auxiliary: 'avere', isc: true },
  { infinitive: 'finire', translation: 'terminar', auxiliary: 'avere', isc: true },
  { infinitive: 'preferire', translation: 'preferir', auxiliary: 'avere', isc: true },
  { infinitive: 'pulire', translation: 'limpar', auxiliary: 'avere', isc: true },
  { infinitive: 'spedire', translation: 'enviar (correio)', auxiliary: 'avere', isc: true },
  { infinitive: 'costruire', translation: 'construir', auxiliary: 'avere', isc: true },
  { infinitive: 'unire', translation: 'unir', auxiliary: 'avere', isc: true },
  { infinitive: 'restituire', translation: 'devolver', auxiliary: 'avere', isc: true },
];
