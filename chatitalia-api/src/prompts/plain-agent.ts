import { ContextState } from "../graphs/schemas"
import { z } from 'zod/v3';

export const PlannerResponseSchema = z.object({
    plannerLogic: z.enum(["advance", "final_response"]),
    // Pra qual node o grafo vai depois: "answer" (pergunta/pedido de ajuda,
    // sem RAG) ou "conversational" (prática no tema, com RAG do livro).
    responseRoute: z.enum(["answer", "conversational"]),
    finalConsiderations: z.string(),
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
        `advance/conversational — msgs 4, theme "il cibo", message: "mi piace molto pasta e al sabato cucino per la mia famiglia" (comprehensible, on-topic, reached the minimum).`,
        `final_response/conversational — msgs 3, theme "numeri",  message: "io ho venti anni" (fine for A, but still below ${MIN_USER_MESSAGES_TO_ADVANCE} practice messages).`,
        `final_response/answer — msgs 5, theme "la geografia", message: "quali sono le regioni d'Italia?" (a QUESTION, not practice — answer it, keep the theme open).`,
    ],
    B: [
        `advance/conversational — msgs 4, theme "il passato prossimo": "sabato scorso sono andato al mercato e ho comprato le verdure" (uses the target structure correctly, past the minimum).`,
        `final_response/conversational — msgs 5, theme "il passato prossimo": "di solito il sabato faccio la spesa e cucino" (correct but present tense only — does not practice the target structure).`,
        `final_response/answer — msgs 5, theme "il periodo ipotetico": "Don, mi spieghi la differenza tra 'se avessi' e 'se avrei'?" (request for help — answer it, keep the theme open).`,
    ],
    C: [
        `advance/conversational — msgs 5, theme "il discorso indiretto": "mi ha detto che sarebbe partito il giorno seguente se avesse trovato un volo" (complex, correct backshift, past the minimum).`,
        `final_response/conversational — msgs 5, theme "le forme impersonali": "penso che il lavoro da remoto sia molto comodo per me" (fluent, but a plain personal opinion — does not really use the impersonal form).`,
        `final_response/conversational — msgs 3, theme "il congiuntivo trapassato": "se avessi saputo, sarei venuto prima" (correct and on target, but below the minimum practice messages).`,
    ],
};

export const buildSystemPrompt = (
    context: ContextState,
    userMessagesOnTheme: number,
    ragContext: string[] = [],
) => {
    const level = (context.level || "A1").toUpperCase();
    const band = level.startsWith("B") ? "B" : level.startsWith("C") ? "C" : "A";
    const hasTheme = Boolean(context.themeId && context.lessonId);

    return [
        `You are an Italian Learning Planner. Two decisions:`,
        `1. "plannerLogic": "advance" (the student has practiced this theme enough and well enough) or "final_response" (keep practicing).`,
        `2. "responseRoute": which node replies next — see below.`,
        `"finalConsiderations" is ALWAYS written in Portuguese (pt-BR), even though the theme itself is in Italian.`,
        ``,
        `## This student`,
        `- Level ${level} (band ${band}).`,
        `- Theme: ${context.theme || "—"} | themeId: ${context.themeId || "—"} | lessonId: ${context.lessonId || "—"}.`,
        `- Practice messages the student has already sent on THIS theme: ${userMessagesOnTheme}.`,
        `- Bar for this student: ${BAR_BY_BAND[band]}`,
        ragContext.length ? `- Book excerpts related to the student's message (context only): ${ragContext.join(' | ')}` : null,
        ``,
        `## Choose "advance" only if ALL of these are true`,
        `3. the LAST message is a real practice sentence — NOT a question, a greeting, or a request to explain/translate ("spiegami", "come si dice", "cosa vuol dire", "explain", or a sentence ending in "?").`,
        `4. that sentence clears the bar above.`,
        `Otherwise choose "final_response". When in doubt, choose "final_response".`,
        ``,
        `## Choose "responseRoute"`,
        `- "answer": the message is a question / greeting / request for help (same trigger words as rule 3 above), OR there is no theme+lesson in context.`,
        `- "conversational": there IS a theme+lesson AND the message is a genuine on-topic utterance, not a question (this is also what "advance" always implies).`,
        `- Current context has a theme+lesson: ${hasTheme ? "yes" : "no"}.`,
        ``,
        `## Examples for band ${band} (format: plannerLogic/responseRoute)`,
        ...EXAMPLES_BY_BAND[band].map((ex) => `- ${ex}`),
        ``,
        `## Output (JSON)`,
        `{`,
        `  "plannerLogic": "advance" | "final_response",`,
        `  "responseRoute": "answer" | "conversational",`,
        `  "finalConsiderations": "ALWAYS Portuguese (pt-BR). ONE short sentence (max ~15 words) about the student's performance ON THIS THEME ONLY — stored per theme, later joined into the lesson summary."`,
        `}`,
    ].filter((line): line is string => line !== null).join("\n");
}
