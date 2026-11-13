import { z } from "zod/v3"
import { ContextState, ErrorsState, FinalResponse, FinalResponseType } from "../graphs/schemas"
import { buildLevelComplexitySection } from "./level-complexity"
import { buildStudentAddressSection } from "./student-address"
import { buildLanguageSection, isMixedLanguageLevel } from "./language-mix"
import { SystemPrompt } from "../infra/llm"

// Aluno praticando no tema (tem themeId+lessonId, não é pergunta): recebe a
// lição inteira pra ancorar a fala e a pergunta final (no fim de "response")
// no conteúdo real.
export const ConversationalAgentSchema = FinalResponse;
export type ConversationalAgentType = FinalResponseType;

// A1/A2 COM erro: em vez de uma pergunta aberta (que travava o iniciante), o
// Don termina pedindo pro aluno FALAR a frase dele corrigida. Sem erro (ou
// B1+), termina com pergunta. Decidido aqui pela lista de erros, não pelo
// modelo. O modelo só copia a frase em "repeat"; o pedido ("Agora é a sua
// vez, fale: ...") é montado no node.
export const isRepeatMode = (level: string | undefined, errors: ErrorsState | undefined): boolean =>
    isMixedLanguageLevel(level) && (errors?.length ?? 0) > 0;

export const ConversationalRepeatSchema = z.object({
    response: z.string(),
    spoken: z.string(),
    repeat: z.string(),
});
export type ConversationalRepeatType = z.infer<typeof ConversationalRepeatSchema>;

// Few-shots da frase pra repetir: a frase do aluno corrigida, palavra por palavra.
const REPEAT_EXAMPLES = [
    `student: "io sono venti anni" -> repeat: "Ho venti anni"`,
    `student: "ieri ho andato al mercato con mia madre" -> repeat: "Ieri sono andato al mercato con mia madre"`,
    `student: "la problema è grande" -> repeat: "Il problema è grande"`,
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
    const repeatMode = isRepeatMode(current?.level, errors);
    const closing = repeatMode
        ? `end by putting the whole corrected sentence in "repeat" (the student will say it out loud) — see "repeat" below; "response" never ends with a question.`
        : `end "response" with ONE open question about the theme (the only question in the reply) — ground it in the theme content when possible, but never reveal the answer inside it.`;

    const cached = [
        `You are Don Italiano: a warm, patient, lightly theatrical old Italian mentor. A few signature touches (famiglia, food), never a caricature.`,
        hasErrors
            ? `The student is practicing the current theme (not asking a question). Reply: 1. correct EVERY item in "errors" (one line each — items with the same reason share one line —, with the correction pattern below, then the whole sentence corrected); 2. one warm line continuing the topic, grounded in the theme content below when relevant; 3. ${closing}`
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
                `EXACTLY, word for word, the corrected sentence you wrote after "A frase inteira fica assim" / "La frase giusta è". Add nothing, remove nothing. Plain sentence: no quotes, no question, no Portuguese.`,
                ...REPEAT_EXAMPLES.map((example) => `- ${example}`),
            ]
            : [
                `## Final question`,
                `About the theme, built on what the student just said: make them practice the theme's words or grammar talking about their own life. Open and concrete, never yes/no, never generic ("Ti piace?", "E tu?").`,
                `The examples only show the style: write your OWN question from the student's exact words, never copy or lightly rephrase an example.`,
                ...QUESTION_EXAMPLES.map((example) => `- ${example}`),
            ]),
        ``,
        `## Never`,
        ...(repeatMode
            ? []
            : [`- Never repeat a question already asked in the history (same subject counts as repeated) — pick a fresh angle.`]),
        `- Never correct writing (case, punctuation, accents) — only real speech mistakes in "errors".`,
        `- Never go outside the current theme, announce the question mechanically, or mention internal state.`,
        ``,
        `## "response" and "spoken" format`,
        `Only letters, spaces, . , ! ? ' and '...'. No other punctuation, no markdown, no line breaks. Quote words with simple single quotes.`,
        ``,
        `Output JSON: { "response": "${hasErrors ? 'corrections + whole sentence corrected + one warm line' : 'one warm line reacting to what they said, no corrections'}${repeatMode ? ', no question' : ' + one open question about the theme at the end'}", "spoken": "Italian-only version of response, or \"\" (see Output language)"${repeatMode ? ', "repeat": "the whole corrected sentence, word for word"' : ''} }`,
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
                `"${theme}" is the NEW theme, "${previousTheme}" just finished. ${repeatMode ? 'Continue' : 'The question MUST be'} about the NEW theme. No history this turn — don't announce the change, just start fresh.`,
            ]
            : []),
    ].join("\n");

    return { cached, dynamic };
};
