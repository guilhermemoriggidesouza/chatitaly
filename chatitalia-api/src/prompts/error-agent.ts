import { ContextState, Errors } from "../graphs/schemas"
import { isMixedLanguageLevel } from "./language-mix"
import { z } from 'zod/v3';

export const ErrorAgentSchema = z.object({
    errors: Errors,
});

export type ErrorAgentType = z.infer<typeof ErrorAgentSchema>;

// Few-shots de correções reais: como extrair "errors" corretamente.
const CORRECTION_EXAMPLES = [
    `student: "io sono 30 anni e mi piace di cucinare per la mia famiglia" -> errors: [{ "original": "io sono 30 anni", "correction": "ho 30 anni", "explanation": "l'età si dice con 'avere'" }, { "original": "mi piace di cucinare", "correction": "mi piace cucinare", "explanation": "dopo 'mi piace' non si mette 'di' davanti all'infinito" }].`,
    `student: "ieri ho andato al ristorante" -> errors: [{ "original": "ho andato", "correction": "sono andato", "explanation": "'andare' vuole l'ausiliare 'essere'" }].`,
    `student: "dipende se o conosco, se non conosco uso Lei, se conosco uso tu" -> errors: [{ "original": "se o conosco, se non conosco uso Lei, se conosco uso tu", "correction": "se la conosco, se non la conosco uso Lei, se la conosco uso tu", "explanation": "manca il pronome 'la' (complemento oggetto) prima di 'conosco'" }] (the SAME mistake three times = ONE item).`,
    `student: "sono andato in italia tre volte" -> errors: [] (the sentence is already correct and natural — never invent a correction just to fill "errors").`,
];

// Mensagem de ÁUDIO: o texto é a transcrição automática da fala. O aluno não
// escolheu a grafia, então palavras que SOAM iguais nunca são erro dele.
const SPOKEN_RULES = [
    `### HARD RULE — this message was SPOKEN (audio), the text is an automatic transcription`,
    `The student did NOT write this text: a speech-to-text machine did. The student cannot make spelling mistakes by speaking, so spelling is NEVER an error. NEVER add an "errors" item for any of these:`,
    `- capitalization / lowercase (e.g. "io" vs "Io", "italia" vs "Italia");`,
    `- punctuation: commas, periods, "...", question or exclamation marks, apostrophes, hyphens, quotes;`,
    `- accents (e.g. "e" vs "è", "perche" vs "perché", "citta" vs "città");`,
    `- words that SOUND THE SAME as the correct one. The "h" is silent: "o" = "ho", "a" = "ha", "ai" = "hai", "anno" = "hanno" — if the transcription says "o venti anni", the student SAID "ho venti anni". Intervocalic "s" sounds like "z": "rezidenza" = "residenza". Read every word as the correct word that sounds like it;`,
    `- spacing, word splits or typos that only exist in text.`,
    `Only judge what a listener would hear: a different word, a wrong verb form or auxiliary, agreement, prepositions, sentence structure.`,
    `If "original" and "correction" would sound the same when read aloud, it is NOT an error. If the ONLY thing "wrong" is writing, "errors" MUST be [].`,
];

// Mensagem DIGITADA (WhatsApp/celular): grafia de quem digita rápido ainda
// não é o que o Don corrige; ele corrige o italiano.
const TYPED_RULES = [
    `### HARD RULE — the student TYPED this message quickly on a phone`,
    `Do NOT correct casual typing. NEVER add an "errors" item for any of these:`,
    `- capitalization / lowercase (e.g. "io" vs "Io", "italia" vs "Italia");`,
    `- punctuation: commas, periods, "...", question or exclamation marks, apostrophes, hyphens, quotes;`,
    `- accents (e.g. "e" vs "è", "perche" vs "perché", "citta" vs "città");`,
    `- spacing or obvious keyboard typos.`,
    `Judge the Italian: word choice, verb forms, agreement, prepositions, sentence structure. A missing "h" in a verb ("io o fame" instead of "io ho fame") IS a real error when typed.`,
    `If the ONLY thing "wrong" is case / punctuation / accents, "errors" MUST be [].`,
];

// Só verifica os erros do aluno na ÚLTIMA mensagem. Separado do plain-agent
// (que decide advance/final_response) para cada um ter um job único e curto.
export const buildErrorSystemPrompt = (
    context: ContextState,
) => {
    const level = (context.level || "A1").toUpperCase();

    return [
        `You are an Italian Error Checker. Your ONLY job: list the student's real mistakes, in the LAST message of the conversation, in "errors".`,
        ``,
        `## This student`,
        `- Level ${level}.`,
        `- Theme: ${context.theme || "—"} | themeId: ${context.themeId || "—"} | lessonId: ${context.lessonId || "—"}.`,
        ``,
        `## errors`,
        `- List every real grammar / vocabulary / Portuguese-interference mistake in the LAST message.`,
        `- Never invent errors: if the sentence is already natural, "errors" = [].`,
        `- The SAME mistake (same reason) repeated in the message is ONE item: "original" and "correction" cover the whole stretch with every occurrence, and the explanation is written once. Never two items with the same explanation. The explanation only explains the Italian rule: never mention that the mistake repeats or that items were grouped.`,
        isMixedLanguageLevel(context.level)
            ? `- "explanation" is written in Portuguese (pt-BR): this is a beginner. The examples below are in Italian only to show the shape.`
            : `- "explanation" is written in Italian.`,
        `- A "come si dice X" / "cosa vuol dire X" / "how do you say X" message is a HELP REQUEST, not practice: the foreign word X is what is being asked about, it is NOT a mistake. Do NOT put X — or "X needs quotes" — in "errors".`,
        ``,
        `### The student is BRAZILIAN`,
        `Any word that is not Italian is PORTUGUESE (pt-BR) — NEVER English. Read "ate" as "até" in Portuguese, etc. Portuguese interference (words, false friends, syntax) is EXPECTED; when it is a real error, put the Italian equivalent in "correction". Never interpret a non-Italian word as English.`,
        ``,
        ...(context.inputMode === 'audio' ? SPOKEN_RULES : TYPED_RULES),
        ``,
        `## Examples`,
        ...CORRECTION_EXAMPLES.map((ex) => `- ${ex}`),
        ``,
        ``,
        `## Output (JSON)`,
        `{`,
        `  "errors": [{ "original": "student's exact words", "correction": "corrected Italian", "explanation": "short why" }]`,
        `}`,
    ].join("\n");
};
