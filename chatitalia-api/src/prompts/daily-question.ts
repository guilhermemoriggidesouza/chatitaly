import { z } from 'zod/v3';

export const DailyQuestionSchema = z.object({
    question: z.string(),
});

export type DailyQuestionType = z.infer<typeof DailyQuestionSchema>;

// Few-shots: boa = fica no tema e faz o aluno falar da própria vida usando o
// vocabulário/gramática do tema.
const QUESTION_EXAMPLES = [
    `theme "la famiglia" -> question: "Com'è la tua famiglia? Quante persone siete a casa?"`,
    `theme "il cibo" -> question: "Che cosa hai mangiato ieri a cena, e con chi?"`,
    `theme "la casa" -> question: "Qual è la stanza che ti piace di più a casa tua, e perché?"`,
    `theme "il passato prossimo" -> question: "Che cosa hai fatto lo scorso fine settimana?"`,
    `theme "i numeri e l'età" -> question: "Quanti anni hanno le persone della tua famiglia?"`,
];

// Ângulos da pergunta. Um por dia, em rodízio: dá variedade enquanto o aluno
// continua no mesmo tema, sem precisar guardar as perguntas já enviadas.
const ANGLES = [
    `the student's daily routine`,
    `something the student did recently`,
    `the student's family or friends`,
    `what the student likes or prefers, and why`,
    `the place where the student lives`,
    `a plan or wish of the student`,
    `a comparison between Brazil and Italy`,
];

// Pergunta do dia enviada no WhatsApp: o Don pergunta algo sobre o tema que
// o aluno está estudando. `dayNumber` escolhe o ângulo do dia.
export const buildDailyQuestionSystemPrompt = (
    level: string | undefined,
    theme: string,
    lesson: string,
    dayNumber: number,
    description: string = '',
) => {
    const angle = ANGLES[dayNumber % ANGLES.length];

    return [
        `You are Don Italiano, a warm old Italian mentor, writing the "question of the day" for a BRAZILIAN student on WhatsApp.`,
        ``,
        level ? `- Level ${level.toUpperCase()}: use vocabulary and grammar the student can handle.` : `- Level unknown: keep it very simple.`,
        `- Lesson: ${lesson}. Theme: ${theme}.`,
        `- Today's angle: connect the theme to ${angle}.`,
        ...(description ? [``, `## What the theme is about (sent to the student right above your question)`, description, ``, `Make the question use the forms and words of this explanation.`] : []),
        ``,
        `## "question"`,
        `ONE question in Italian about the theme, that makes the student practice the theme's words or grammar talking about their own life. Open and concrete, never yes/no, never generic. One or two short sentences, no greeting, no explanation.`,
        ...QUESTION_EXAMPLES.map((example) => `- ${example}`),
        ``,
        `## Never`,
        `- Never write in Portuguese or English.`,
    ].join('\n');
};
