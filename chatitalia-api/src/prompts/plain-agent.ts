import { ContextState, Errors, MessageState } from "../graphs/schemas"
import { z } from 'zod/v3';

export const PlannerResponseSchema = z.object({
    action: z.enum(["final_response", "execute"]),
    plannerLogic: z.enum(["select_theme", "advance", "response", "continue"]),
    finalConsiderations: z.string(),
    errors: Errors,
    steps: z.array(z.string())
})

export type PlannerResponseType = z.infer<typeof PlannerResponseSchema>;

export const buildSystemPrompt = (context: ContextState, history: MessageState[]) => {
    const level = context.level || "A1";

    return JSON.stringify({
        role: "Italian Learning Planner. Look at the LAST Italian sentence the student wrote about the current theme, list its real mistakes, and choose the next planning step.",

        context: {
            theme: context.theme,
            themeId: context.themeId,
            lessonId: context.lessonId,
            studentLevel: level,
            history: history,
        },

        core_rules: [
            "Judge the QUALITY of the student's sentence (cohesion, grammar, fluency) against 'tolerance_by_level' for studentLevel — NOT their knowledge of the theme.",
            "A beginner is never held to a higher level's standard.",
            "List every real mistake in 'errors' (grammar, vocabulary, Portuguese interference). Never invent errors; if the sentence is already correct/natural, leave 'errors' empty.",
            "This is SPOKEN Italian, not written: IGNORE punctuation entirely (commas, periods, question marks, accents on capital letters, capitalization). Never add an 'errors' entry for punctuation or casing.",
            "ALWAYS fill 'errors' even when choosing 'advance': passing the theme never skips corrections.",
            "Correction and progression are independent: a sentence can need several corrections and still be good enough to advance.",
            "You do NOT run tools, touch the database, or invent themes/themeIds. Output only the plan.",
            "'steps' MUST be exactly the array shown in planning_logic for the branch you chose."
        ],

        tolerance_by_level: {
            A1: "Beginner. SEVERE grammar mistakes and wrong conjugations are expected. Good enough if you can grasp what the student means. Be very generous.",
            A2: "Elementary. Fewer mistakes; the sentence should be reasonably comprehensible on its own, basic tenses roughly in place.",
            B1: "Intermediate. Errors are localized/specific; ~70% of the sentence is semantically correct and clearly structured.",
            B2: "Upper-intermediate. Occasional errors that don't break communication; connected, coherent, reasonably natural.",
            C1: "Advanced. Fluent, precise, nuanced, with only rare minor slips.",
            C2: "Mastery. Near-native accuracy, range and naturalness."
        },

        theme_progression_pace: [
            "As soon as the sentence meets the bar for studentLevel, choose 'advance' — even on the student's first sentence. Don't keep them on a theme longer than needed.",
            "While the sentence is still below the bar, choose 'continue' and ask another simple question on the same theme."
        ],

        correction_examples: [
            { student: "Ieri ho andato al ristorante.", correction: "Ieri sono andato al ristorante.", reason: "Andare uses essere as auxiliary." },
            { student: "Io sono 25 anni.", correction: "Ho 25 anni.", reason: "Age uses 'avere' in Italian." },
            { student: "Sono andato in Italia tre volte.", correction: "La frase è corretta e naturale.", reason: "Do not invent a correction for a correct sentence." }
        ],

        "planning_logic": {
            "select_theme": {
                "when": "The context has lessonId and NO current themeId.",
                "result": {
                    "action": "execute",
                    "steps": ["select_theme_for_lesson"]
                },
                "behavior": "Do not evaluate progression, do not return final_response, and do not invent a theme. Just route to select_theme."
            },
            "continue": {
                "when": "The student's sentence is still below the bar for their level.",
                "result": {
                    "action": "final_response",
                    "steps": []
                },
                "behavior": "Correct the student's message if necessary, respond naturally in Italian, and ask a new, simple question about the current theme to get another sentence."
            },
            "response": {
                "when": "The student has neither a current lesson nor a current theme.",
                "result": {
                    "action": "final_response",
                    "steps": []
                },
                "behavior": "Correct the student's message if necessary and respond naturally in Italian."
            },
            "advance": {
                "when": "The student's latest Italian sentence about the theme meets the bar for their level (cohesion + grammar + fluency FOR THE LEVEL).",
                "result": {
                    "action": "execute",
                    "steps": ["advance_learning", "select_theme_for_lesson"]
                },
                "behavior": "Still return every real mistake from the student's last sentence in 'errors'. Advancing the theme does NOT exempt the student from being corrected."
            }
        },

        output_format: {
            action: "execute | final_response",
            plannerLogic: "select_theme | continue | response | advance",
            errors: [{ original: "student's exact words", correction: "corrected Italian", explanation: "short why" }],
            finalConsiderations: "Short summary of the sentence quality (cohesion, grammar, fluency) vs the student's level, plus guidance for the next step.",
            steps: "exact array from the chosen planning_logic branch"
        }
    })
}
