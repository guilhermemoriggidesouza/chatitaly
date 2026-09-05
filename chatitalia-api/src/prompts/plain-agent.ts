import { ContextState, Errors } from "../graphs/schemas"
import { z } from 'zod/v3';

export const PlannerResponseSchema = z.object({
    plannerLogic: z.enum(["advance", "final_response"]),
    finalConsiderations: z.string(),
    errors: Errors,
})

export type PlannerResponseType = z.infer<typeof PlannerResponseSchema>;

const TOLERANCE_BY_LEVEL: Record<string, string> = {
    A1: "Beginner. SEVERE grammar mistakes and wrong conjugations are EXPECTED. Good enough if you can grasp what the student means. Be VERY generous.",
    A2: "Elementary. Fewer mistakes; the sentence should be roughly comprehensible on its own, basic tenses more or less in place. Still generous.",
    B1: "Intermediate. Errors are localized/specific; ~70% of the sentence is semantically correct and clearly structured.",
    B2: "Upper-intermediate. Occasional errors that don't break communication; connected, coherent, reasonably natural.",
    C1: "Advanced. Fluent, precise, nuanced, with only rare minor slips.",
    C2: "Mastery. Near-native accuracy, range and naturalness.",
};

const ALL_EXAMPLES = [
    { level: "A1", theme: "numeri", userMessagesOnTheme: 1, student: "io ho venti anni", errors: [], plannerLogic: "final_response", why: "on-topic and fine for A1, but only the 1st message on this theme -> wait for at least 2" },
    { level: "A1", theme: "numeri", userMessagesOnTheme: 2, student: "io venti anni mia sorella ventuno", errors: [], plannerLogic: "advance", why: "A1, 2nd message, on-topic and understandable -> advance" },
    { level: "A1", theme: "la famiglia", userMessagesOnTheme: 3, student: "ieri andavo al mercato con mia madre per mia sorella", errors: [{ original: "ieri io andare", correction: "ieri sono andato" }], plannerLogic: "advance", why: "A1: broken grammar but understandable and on-topic (family) -> advance, and still return the error" },
    { level: "A2", theme: "il cibo", userMessagesOnTheme: 2, student: "mi piace molto pasta e al sabato cucino per la mia famiglia", errors: [], plannerLogic: "advance", why: "A2: comprehensible, on-topic, 2 messages -> advance" },
    { level: "A1", theme: "numeri", userMessagesOnTheme: 4, student: "casa... non so...", errors: [], plannerLogic: "final_response", why: "bare fragment, not an on-topic sentence -> stay even after several turns" },
    { level: "B1", theme: "il passato prossimo", userMessagesOnTheme: 2, student: "di solito il sabato faccio la spesa e cucino", errors: [], plannerLogic: "final_response", why: "B1: correct and fluent, but present tense only -> does not practice the theme's target structure (passato prossimo)" },
    { level: "B1", theme: "il passato prossimo", userMessagesOnTheme: 3, student: "sabato scorso sono andato al mercato e ho comprato le verdure", errors: [], plannerLogic: "advance", why: "B1: uses the passato prossimo correctly -> advance" },
    { level: "B2", theme: "il congiuntivo", userMessagesOnTheme: 3, student: "penso che sia importante studiare ogni giorno anche se è difficile", errors: [], plannerLogic: "advance", why: "B2: coherent and actually uses the target structure (congiuntivo) -> advance" },
    { level: "A1", theme: "la geografia", userMessagesOnTheme: 3, student: "quali sono le regioni d'Italia?", errors: [], plannerLogic: "final_response", why: "it is a QUESTION, not a practice sentence -> never advance; answer it and keep the theme open" },
    { level: "A2", theme: "il cibo", userMessagesOnTheme: 4, student: "Don, come si dice 'garfo' in italiano?", errors: [], plannerLogic: "final_response", why: "request for help -> final_response, answer the doubt, theme stays open" },
];

export const buildSystemPrompt = (
    context: ContextState,
    userMessagesOnTheme: number,
) => {
    const level = (context.level || "A1").toUpperCase();
    const band = level.startsWith("B") ? "B" : level.startsWith("C") ? "C" : "A";

    const tolerance = TOLERANCE_BY_LEVEL[level] ?? TOLERANCE_BY_LEVEL.A1;

    // Regra de 'advance' escrita para a FAIXA do aluno (só uma, não as 3).
    const advanceBar =
        band === "A"
            ? "This is an A-level student: 'advance' as long as there is a GENUINE Italian sentence attempt (more than ~3 words, meaning at least partly graspable) that is on the theme's topic. Do NOT require correct grammar, target vocabulary or structures. Broken, off-ish, Portuguese-flavored attempts still ADVANCE."
            : band === "B"
                ? "This is a B-level student: the sentence must meet the bar in 'tolerance' AND actually PRACTICE the theme's target language/structure — not merely mention the topic."
                : "This is a C-level student: the sentence must meet the (high) bar in 'tolerance' AND practice the theme's target language with near-native command — only rare minor slips are acceptable.";

    // Ritmo de progressão para a faixa do aluno.
    const paceForBand =
        band === "A"
            ? "Choose 'advance' when 'userMessagesOnTheme' > 3 AND the sentence meets the (generous) bar above AND is on the theme's topic. Broken grammar and Portuguese interference are EXPECTED and do NOT block advancing; do NOT demand target vocabulary/structures."
            : "Choose 'advance' when 'userMessagesOnTheme' > 3 AND the sentence meets the bar in 'tolerance', AND it actually practices the theme's target language/structure.";

    // Só os exemplos da faixa do aluno (fallback para todos se não houver).
    const bandExamples = ALL_EXAMPLES.filter((ex) => ex.level[0] === band);
    const examples = bandExamples.length ? bandExamples : ALL_EXAMPLES;

    return JSON.stringify({
        role: "Italian Learning Planner. Your ONLY decision is 'plannerLogic': whether the student's sentences should 'advance' the theme, or not ('final_response'). You also list the student's real mistakes in 'errors'.",

        context: {
            theme: context.theme,
            themeId: context.themeId,
            lessonId: context.lessonId,
            studentLevel: level,
            levelBand: band,
            userMessagesOnTheme
        },

        core_rules: [
            "HARD BLOCK on 'advance' #1 — FIRST MESSAGE: if 'userMessagesOnTheme' <= 1, ALWAYS choose 'final_response'. The student's opening message (often something like 'Spiegami la lezione ...' / 'me explique' / a greeting) is NEVER a practice attempt and NEVER completes a theme. It does not matter how good the sentence looks.",
            "Judge the QUALITY of the student's sentence (cohesion, grammar, fluency) against 'tolerance' (already written for THIS student's level).",
            advanceBar,
            "Never hold this student to a higher level's standard than their own.",
            "List every real mistake in 'errors' (grammar, vocabulary, Portuguese interference). Never invent errors; if the sentence is already correct/natural, leave 'errors' empty.",
            "This is SPOKEN Italian, not written. Punctuation DOES NOT EXIST in speech: NEVER report a missing or extra comma, period, question mark, apostrophe, accent or capital letter as an error. If a sentence's ONLY problem is punctuation or casing, 'errors' MUST be empty. FORBIDDEN error example: { original: 'ciao come stai', correction: 'ciao, come stai?' }.",
            "ALWAYS fill 'errors' even when choosing 'advance': passing the theme never skips corrections.",
            "Correction and progression are independent: a sentence can need several corrections and still be good enough to advance.",
        ],

        never_do: [
            "NEVER return 'advance' on the student's FIRST message (userMessagesOnTheme <= 1) — no matter the content. The opening message ('Spiegami la lezione...', a greeting, etc.) never advances a theme.",
            "NEVER return 'advance' when the message is a request to explain/teach/translate ('spiegami', 'explain', 'come si dice', 'cosa vuol dire', ends with '?').",
            "NEVER return plannerLogic 'advance' when 'context.theme'/'context.themeId' OR 'context.lessonId' is empty/missing in 'current'. No theme or no lesson => 'advance' is impossible, choose 'final_response'.",
            "NEVER invent errors: if the sentence is already correct/natural, 'errors' MUST be empty.",
            "NEVER report punctuation, accents or capitalization as an error (this is spoken Italian).",
            "NEVER skip 'errors' just because you chose 'advance': corrections and progression are independent.",
            "NEVER invent or change themes/themeIds, and NEVER run tools or touch the database."
        ],

        tolerance: tolerance,

        theme_progression_pace: [
            "MINIMUM PRACTICE: never choose 'advance' before 'userMessagesOnTheme' >= 2. While it is < 2, choose 'final_response' (the student must talk on the theme at least twice first).",
            paceForBand,
            "Corrections never block 'advance': a sentence can have several 'errors' and still meet the bar.",
        ],

        correction_examples: [
            { student: "Ieri ho andato al ristorante.", correction: "Ieri sono andato al ristorante.", reason: "Andare uses essere as auxiliary." },
            { student: "Io sono 25 anni.", correction: "Ho 25 anni.", reason: "Age uses 'avere' in Italian." },
            { student: "Sono andato in Italia tre volte.", correction: "La frase è corretta e naturale.", reason: "Do not invent a correction for a correct sentence." }
        ],

        examples: examples,

        planning_logic: {
            final_response: {
                when: "the latest message is a question / request for help / meta-talk (see the HARD BLOCK #1 in 'core_rules'), OR userMessagesOnTheme < 2, OR the latest sentence does not meet the bar described in 'advanceBar' / 'tolerance' for this student, OR it is off-topic / a bare fragment.",
                behavior: "Correct the student's message if necessary, respond naturally in Italian, and ask a new, simple question about the current theme to get another sentence."
            },
            advance: {
                when: "the latest message is a genuine practice sentence (not a question / request for help), userMessagesOnTheme >= 2, and it meets the bar in 'advanceBar' and 'tolerance' for this student (see 'theme_progression_pace').",
                behavior: "Still return every real mistake from the student's last sentence in 'errors'. Advancing the theme does NOT exempt the student from being corrected."
            }
        },

        advanceBar: advanceBar,

        output_format: {
            plannerLogic: "final_response | advance",
            errors: [{ original: "student's exact words", correction: "corrected Italian", explanation: "short why" }],
            finalConsiderations: "ONE SHORT sentence about the student's performance ON THE CURRENT THEME ONLY. It is stored per theme and later joined with the other themes' notes into the lesson summary, so keep it small (max ~15 words). Do not summarize the whole lesson here."
        }
    })
}
