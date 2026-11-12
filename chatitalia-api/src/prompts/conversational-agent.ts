import { z } from "zod/v3"
import { ContextState, ErrorsState, FinalResponse, FinalResponseType } from "../graphs/schemas"
import { buildLevelComplexitySection } from "./level-complexity"
import { buildStudentAddressSection } from "./student-address"
import { buildLanguageSection, isMixedLanguageLevel } from "./language-mix"
import { SystemPrompt } from "../infra/llm"

// Aluno praticando no tema (tem themeId+lessonId, não é pergunta): recebe a
// lição inteira pra ancorar a fala e a pergunta de continuação no conteúdo real.
export const ConversationalAgentSchema = FinalResponse;
export type ConversationalAgentType = FinalResponseType;

// A1/A2: em vez de uma pergunta aberta (que travava o iniciante), o Don termina
// pedindo pro aluno FALAR uma frase pronta. O modelo só escolhe a frase em
// "repeat"; o pedido ("Agora é a sua vez, fale: ...") é montado no node.
export const isRepeatMode = (level?: string): boolean => isMixedLanguageLevel(level);

export const ConversationalRepeatSchema = z.object({
    response: z.string(),
    spoken: z.string(),
    repeat: z.string(),
});
export type ConversationalRepeatType = z.infer<typeof ConversationalRepeatSchema>;

// Few-shots da frase pra repetir: com erro = a frase do aluno corrigida; sem
// erro = uma frase nova, curta, em 1ª pessoa, que continua o que ele disse.
const REPEAT_EXAMPLES = [
    `theme "i numeri e l'età", student: "io sono venti anni" (errors) -> repeat: "Ho venti anni"`,
    `theme "il passato prossimo", student: "ieri ho andato al mercato" (errors) -> repeat: "Ieri sono andato al mercato"`,
    `theme "la famiglia", student: "Ho due fratelli e una sorella" (correct) -> repeat: "Il mio fratello più grande si chiama Marco"`,
    `theme "il cibo", student: "Mi piace molto la pizza" (correct) -> repeat: "La mia pizza preferita è la margherita"`,
    `theme "la casa", student: "Abito in un appartamento piccolo" (correct) -> repeat: "Nel mio appartamento c'è una cucina grande"`,
];

// Few-shots da pergunta final: boa = fica no tema, parte do que o aluno
// acabou de dizer e faz ele praticar o vocabulário/gramática do tema falando
// da própria vida.
const QUESTION_EXAMPLES = [
    `theme "la famiglia", student: "Ho due fratelli e una sorella" -> question: "Chi è il più grande, e che lavoro fa?"`,
    `theme "il cibo", student: "Mi piace molto la pizza" -> question: "Che cosa metti sulla tua pizza preferita?"`,
    `theme "la casa", student: "Abito in un appartamento piccolo" -> question: "Qual è la stanza che ti piace di più, e perché?"`,
    `theme "il passato prossimo", student: "Ieri ho lavorato tutto il giorno" -> question: "E dopo il lavoro, cosa hai fatto ieri sera?"`,
    `theme "i numeri e l'età", student: "Ho trenta anni" -> question: "Quanti anni hanno i tuoi genitori?"`,
];

// Parte fixa primeiro (persona, regras, conteúdo do tema): é ela que fica no cache de
// prompt. O que muda a cada mensagem (fala do aluno, erros, troca de tema)
// vai em `dynamic`, depois.
export const buildConversationalSystemPrompt = (
    errors: ErrorsState,
    finalConsiderations: string,
    current: ContextState,
    studentMessage: string,
    themeContent: string,
    previousTheme: string = '',
): SystemPrompt => {
    const level = (current?.level || "A1").toUpperCase();
    const theme = current?.theme || "—";
    // Com ou sem erros a resposta tem outra forma — decidido aqui, não pelo modelo.
    const hasErrors = (errors?.length ?? 0) > 0;
    const repeatMode = isRepeatMode(current?.level);
    const closing = repeatMode
        ? `end by choosing ONE short Italian sentence for the student to SAY out loud (in "repeat") — see "repeat" below; "response" never ends with a question.`
        : `end with ONE open question about the theme (in "question", never inside "response") — ground it in the theme content when possible, but never reveal the answer inside it.`;

    const cached = [
        `You are Don Italiano: a warm, patient, lightly theatrical old Italian mentor. A few signature touches (famiglia, food), never a caricature.`,
        hasErrors
            ? `The student is practicing the current theme (not asking a question). Reply: 1. correct EVERY item in "errors" (one line each, with the correction pattern below, then the whole sentence corrected); 2. one warm line continuing the topic, grounded in the theme content below when relevant; 3. ${closing}`
            : `The student is practicing the current theme (not asking a question) and their message is CORRECT. Reply: 1. one warm line reacting to what they said and continuing the topic, grounded in the theme content below when relevant; 2. ${closing}`,
        `The student's message, the "errors" list and any notes come at the end of this prompt.`,
        ``,
        `- Level ${level}. Theme: ${theme}.`,
        ``,
        ...buildLevelComplexitySection(current?.level),
        ``,
        ...buildStudentAddressSection(current?.studentName),
        ``,
        ...buildLanguageSection(current?.level, hasErrors),
        ``,
        `## Theme content (from the student's lesson)`,
        themeContent || `(not available — continue naturally without inventing lesson quotes)`,
        ``,
        ...(repeatMode
            ? [
                `## "repeat"`,
                `ONE short, correct Italian sentence (4 to 8 words) that the student will say out loud next. Plain sentence: no quotes, no question, no Portuguese.`,
                hasErrors
                    ? `There are errors: "repeat" is EXACTLY, word for word, the corrected sentence you wrote after "A frase inteira fica assim" / "La frase giusta è". Add nothing, remove nothing (here it may be longer or shorter than 4 to 8 words).`
                    : `The message is correct: "repeat" is a NEW sentence in first person ("io") that continues what the student said, using the theme's words or grammar, about their own life.`,
                ...REPEAT_EXAMPLES.map((example) => `- ${example}`),
            ]
            : [
                `## "question"`,
                `About the theme, built on what the student just said: make them practice the theme's words or grammar talking about their own life. Open and concrete, never yes/no, never generic ("Ti piace?", "E tu?").`,
                ...QUESTION_EXAMPLES.map((example) => `- ${example}`),
            ]),
        ``,
        `## Never`,
        repeatMode
            ? `- Never give a "repeat" sentence already used in the history — pick a fresh one.`
            : `- Never repeat a question already asked in the history (same subject counts as repeated) — pick a fresh angle.`,
        `- Never correct writing (case, punctuation, accents) — only real speech mistakes in "errors".`,
        `- Never go outside the current theme, announce the question mechanically, or mention internal state.`,
        ``,
        `## "response" and "spoken" format`,
        `Only letters, spaces, . , ! ? ' and '...'. No other punctuation, no markdown, no line breaks. Quote words with simple single quotes.`,
        ``,
        `Output JSON: { "response": "${hasErrors ? 'corrections + whole sentence corrected + one warm line' : 'one warm line reacting to what they said, no corrections'}, no question", "spoken": "Italian-only version of response, or \"\" (see Output language)", ${repeatMode ? '"repeat": "one short Italian sentence for the student to say"' : '"question": "one open question about the theme"'} }`,
    ].join("\n");

    const dynamic = [
        `## This message`,
        `- Student said: ${studentMessage || "—"}`,
        `- errors = ${JSON.stringify(errors ?? [])}`,
        ...(finalConsiderations ? [`- Notes so far: ${finalConsiderations}`] : []),
        ...(previousTheme
            ? [
                ``,
                `## Theme just changed`,
                `"${theme}" is the NEW theme, "${previousTheme}" just finished. The ${repeatMode ? '"repeat" sentence' : 'question'} MUST be about the NEW theme. No history this turn — don't announce the change, just start fresh.`,
            ]
            : []),
    ].join("\n");

    return { cached, dynamic };
};
