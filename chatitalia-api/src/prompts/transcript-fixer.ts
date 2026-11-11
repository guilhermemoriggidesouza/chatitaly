import { z } from 'zod/v3';

export const TranscriptFixerSchema = z.object({
    text: z.string(),
});

export type TranscriptFixerType = z.infer<typeof TranscriptFixerSchema>;

// Few-shots: [fala do Don, transcrição, saída]. Um exemplo por tipo de caso.
// SOUND: grafia fonética vira a palavra que soa igual.
const SOUND_EXAMPLES: [string, string, string][] = [
    ['Quanti anni hai?', 'ovent yani', 'ho venti anni'],
    ['Dove abiti?', 'la mia rezidenza è a San Paolo', 'la mia residenza è a San Paolo'],
    ['I tuoi genitori lavorano?', 'si, anno un negozio', 'sì, hanno un negozio'],
    ['Come ti chiami?', 'mi kiamo Giulia e mi piache legere', 'mi chiamo Giulia e mi piace leggere'],
    ['Dove vai?', 'in italia lanno prossimo perke', "in Italia l'anno prossimo perché"],
];

// KEEP: erro real do aluno fica EXATAMENTE como veio (é o que o Don corrige).
const KEEP_EXAMPLES: [string, string, string][] = [
    ['Quanti anni hai?', 'io sono trenta anni', 'io sono trenta anni'],
    ['Cosa hai fatto ieri?', 'ieri ho andato al ristorante', 'ieri ho andato al ristorante'],
    ["Com'è la tua casa?", 'la problema è che la casa è bello', 'la problema è che la casa è bello'],
    ['Cosa fai nel weekend?', 'gosto de andare alla praia', 'gosto de andare alla praia'],
];

const formatExample = ([don, raw, out]: [string, string, string]) =>
    `- Don: "${don}" | "${raw}" -> "${out}"`;

// Revisa a transcrição automática do áudio do aluno ANTES do corretor.
// Só troca o que SOA igual; nunca conserta o italiano do aluno.
export const TRANSCRIPT_FIXER_PROMPT = [
    `A speech-to-text machine transcribed a BRAZILIAN student speaking Italian (sometimes Portuguese). It often spells phonetically, splits/joins words wrongly or drops the silent "h".`,
    `Rewrite it as the words the student actually SAID, in standard spelling. You are NOT a teacher: NEVER fix the student's Italian.`,
    ``,
    `- Change a word ONLY if the new one SOUNDS THE SAME (or almost): silent "h" (o/ho, a/ha, anno/hanno), phonetic spelling, word splits, accents, capitals. Use the Don's last message as context.`,
    `- KEEP EXACTLY: real Italian words even if wrong, verb forms, auxiliaries, articles, gender, prepositions, word order, Portuguese words and false friends.`,
    `- If in doubt, keep it. Hiding a real mistake is worse than a strange spelling.`,
    ``,
    `## Fix (sounds the same)`,
    ...SOUND_EXAMPLES.map(formatExample),
    `## Keep (real mistakes)`,
    ...KEEP_EXAMPLES.map(formatExample),
    ``,
    `Output JSON: { "text": "..." }`,
].join('\n');

export const buildTranscriptFixerInput = (raw: string, lastDonMessage?: string) =>
    `Don: "${(lastDonMessage || '—').slice(0, 600)}"\nTranscription: "${raw}"`;
