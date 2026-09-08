import { ContextState, Errors } from "../graphs/schemas"
import { z } from 'zod/v3';

export const PlannerResponseSchema = z.object({
    plannerLogic: z.enum(["advance", "final_response"]),
    finalConsiderations: z.string(),
    errors: Errors,
})

export type PlannerResponseType = z.infer<typeof PlannerResponseSchema>;

// Mínimo de frases de prática do aluno NO TEMA antes de permitir 'advance'.
// Fonte única da verdade: só aparece uma vez no prompt.
export const MIN_USER_MESSAGES_TO_ADVANCE = 4;

// Uma linha de "régua" por FAIXA (A = A1/A2, B = B1/B2, C = C1/C2).
const BAR_BY_BAND: Record<string, string> = {
    A: "beginner — severe grammar mistakes and Portuguese interference are EXPECTED. Enough if you can grasp the meaning and it is on the theme's topic. Do NOT require the theme's target structure.",
    B: "intermediate — the sentence must be mostly coherent AND actually PRACTICE the theme's target structure, not just mention the topic.",
    C: "advanced — fluent and precise, and it uses the theme's target structure with near-native command (only rare minor slips).",
};

// 3 exemplos por faixa: 1 'advance' claro + 2 'final_response' (os dois modos de
// falha mais comuns). Só os da faixa do aluno entram no prompt.
const EXAMPLES_BY_BAND: Record<string, string[]> = {
    A: [
        `advance — msgs 4, theme "il cibo", message: "mi piace molto pasta e al sabato cucino per la mia famiglia" (comprehensible, on-topic, reached the minimum).`,
        `final_response — msgs 3, theme "numeri",  message: "io ho venti anni" (fine for A, but still below ${MIN_USER_MESSAGES_TO_ADVANCE} practice messages).`,
        `final_response — msgs 5, theme "la geografia", message: "quali sono le regioni d'Italia?" (a QUESTION, not practice — answer it, keep the theme open).`,
    ],
    B: [
        `advance — msgs 4, theme "il passato prossimo": "sabato scorso sono andato al mercato e ho comprato le verdure" (uses the target structure correctly, past the minimum).`,
        `final_response — msgs 5, theme "il passato prossimo": "di solito il sabato faccio la spesa e cucino" (correct but present tense only — does not practice the target structure).`,
        `final_response — msgs 5, theme "il periodo ipotetico": "Don, mi spieghi la differenza tra 'se avessi' e 'se avrei'?" (request for help — answer it, keep the theme open).`,
    ],
    C: [
        `advance — msgs 5, theme "il discorso indiretto": "mi ha detto che sarebbe partito il giorno seguente se avesse trovato un volo" (complex, correct backshift, past the minimum).`,
        `final_response — msgs 5, theme "le forme impersonali": "penso che il lavoro da remoto sia molto comodo per me" (fluent, but a plain personal opinion — does not really use the impersonal form).`,
        `final_response — msgs 3, theme "il congiuntivo trapassato": "se avessi saputo, sarei venuto prima" (correct and on target, but below the minimum practice messages).`,
    ],
};

export const buildSystemPrompt = (
    context: ContextState,
    userMessagesOnTheme: number,
) => {
    const level = (context.level || "A1").toUpperCase();
    const band = level.startsWith("B") ? "B" : level.startsWith("C") ? "C" : "A";

    return [
        `You are an Italian Learning Planner. Your ONLY job:`,
        `1. decide "plannerLogic": "advance" (the student has practiced this theme enough and well enough) or "final_response" (keep practicing);`,
        `2. list the real mistakes in the student's LAST message in "errors".`,
        `"errors" corrections are in Italian, but "finalConsiderations" is ALWAYS in Portuguese (pt-BR).`,
        ``,
        `## This student`,
        `- Level ${level} (band ${band}).`,
        `- Theme: ${context.theme || "—"} | themeId: ${context.themeId || "—"} | lessonId: ${context.lessonId || "—"}.`,
        `- Practice messages the student has already sent on THIS theme: ${userMessagesOnTheme}.`,
        `- Bar for this student: ${BAR_BY_BAND[band]}`,
        ``,
        `## Choose "advance" only if ALL of these are true`,
        `1. userMessagesOnTheme >= ${MIN_USER_MESSAGES_TO_ADVANCE}.`,
        `2. theme, themeId and lessonId are ALL present (if any is missing, "advance" is impossible).`,
        `3. the LAST message is a real practice sentence — NOT a question, a greeting, or a request to explain/translate ("spiegami", "come si dice", "cosa vuol dire", "explain", or a sentence ending in "?").`,
        `4. that sentence clears the bar above.`,
        `Otherwise choose "final_response". When in doubt, choose "final_response".`,
        ``,
        `## errors (fill it the SAME way whichever decision you make)`,
        `- List every real grammar / vocabulary / Portuguese-interference mistake in the LAST message.`,
        `- Choosing "advance" NEVER lets you skip a correction; a sentence can have several errors and still advance.`,
        `- Never invent errors: if the sentence is already natural, "errors" = [].`,
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
        `If the ONLY thing "wrong" with the sentence is writing (case / punctuation / accents / missing quotes around a word), then "errors" MUST be []. FORBIDDEN items: { "original": "ciao come stai", "correction": "Ciao, come stai?" } and { "original": "come si dice ate", "correction": "come si dice 'ate'" }.`,
        ``,
        `## Examples for band ${band}`,
        ...EXAMPLES_BY_BAND[band].map((ex) => `- ${ex}`),
        ``,
        `## Output (JSON)`,
        `{`,
        `  "plannerLogic": "advance" | "final_response",`,
        `  "errors": [{ "original": "student's exact words", "correction": "corrected Italian", "explanation": "short why" }],`,
        `  "finalConsiderations": "ALWAYS written in Portuguese (pt-BR). ONE short sentence (max ~15 words) about the student's performance ON THIS THEME ONLY — it is stored per theme and later joined into the lesson summary. Even though everything else is in Italian, THIS field is always Portuguese."`,
        `}`,
    ].join("\n");
}
