import { ContextState, Errors } from "../graphs/schemas"
import { z } from 'zod/v3';

export const ErrorAgentSchema = z.object({
    errors: Errors,
});

export type ErrorAgentType = z.infer<typeof ErrorAgentSchema>;

// Few-shots de correções reais: como extrair "errors" corretamente.
const CORRECTION_EXAMPLES = [
    `student: "io sono 30 anni e mi piace di cucinare per la mia famiglia" -> errors: [{ "original": "io sono 30 anni", "correction": "ho 30 anni", "explanation": "l'età si dice con 'avere'" }, { "original": "mi piace di cucinare", "correction": "mi piace cucinare", "explanation": "dopo 'mi piace' non si mette 'di' davanti all'infinito" }].`,
    `student: "ieri ho andato al ristorante" -> errors: [{ "original": "ho andato", "correction": "sono andato", "explanation": "'andare' vuole l'ausiliare 'essere'" }].`,
    `student: "sono andato in italia tre volte" -> errors: [] (the sentence is already correct and natural — never invent a correction just to fill "errors").`,
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
        `- A "come si dice X" / "cosa vuol dire X" / "how do you say X" message is a HELP REQUEST, not practice: the foreign word X is what is being asked about, it is NOT a mistake. Do NOT put X — or "X needs quotes" — in "errors".`,
        ``,
        `### The student is BRAZILIAN`,
        `Any word that is not Italian is PORTUGUESE (pt-BR) — NEVER English. Read "ate" as "até" in Portuguese, etc. Portuguese interference (words, false friends, syntax) is EXPECTED; when it is a real error, put the Italian equivalent in "correction". Never interpret a non-Italian word as English.`,
        ``,
        `### HARD RULE — spoken Italian, NOT written`,
        `The message is a raw speech transcription. WRITING is invisible in speech, so it is NEVER an error. NEVER add an "errors" item for any of these:`,
        `- capitalization / lowercase (e.g. "io" vs "Io", start of sentence, names, "italia" vs "Italia");`,
        `- punctuation: commas, periods, "...", question or exclamation marks, apostrophes, hyphens, quotes;`,
        `- accents (e.g. "e" vs "è", "perche" vs "perché", "citta" vs "città");`,
        `- spacing, line breaks or typos that only exist in text.`,
        `Only judge what a listener would hear: word choice, verb forms, agreement, prepositions, sentence structure.`,
        `If the ONLY thing "wrong" with the sentence is writing (case / punctuation / accents / missing quotes around a word), then "errors" MUST be [].`,
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
