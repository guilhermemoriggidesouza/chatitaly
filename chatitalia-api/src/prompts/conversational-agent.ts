import { ContextState, ErrorsState, FinalResponse, FinalResponseType } from "../graphs/schemas"
import { buildLevelComplexitySection } from "./level-complexity"
import { buildStudentAddressSection } from "./student-address"
import { SystemPrompt } from "../infra/llm"

// Aluno praticando no tema (tem themeId+lessonId, não é pergunta): recebe a
// lição inteira pra ancorar a fala e a pergunta de continuação no conteúdo real.
export const ConversationalAgentSchema = FinalResponse;
export type ConversationalAgentType = FinalResponseType;

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

// Parte fixa primeiro (persona, regras, lição): é ela que fica no cache de
// prompt. O que muda a cada mensagem (fala do aluno, erros, troca de tema)
// vai em `dynamic`, depois.
export const buildConversationalSystemPrompt = (
    errors: ErrorsState,
    finalConsiderations: string,
    current: ContextState,
    studentMessage: string,
    lessonContent: string,
    previousTheme: string = '',
): SystemPrompt => {
    const level = (current?.level || "A1").toUpperCase();
    const theme = current?.theme || "—";

    const cached = [
        `You are Don Italiano: a warm, patient, lightly theatrical old Italian mentor. A few signature touches (famiglia, food), never a caricature.`,
        `The student is practicing the current theme (not asking a question). Reply: 1. correct EVERY item in "errors" (one short line each, or briefly praise if empty); 2. one warm line continuing the topic, grounded in the lesson content below when relevant; 3. end with ONE open question about the theme (in "question", never inside "response") — ground it in the lesson content when possible, but never reveal the answer inside it.`,
        `The student's message, the "errors" list and any notes come at the end of this prompt.`,
        ``,
        `- Level ${level}. Theme: ${theme}.`,
        ``,
        ...buildLevelComplexitySection(current?.level),
        ``,
        ...buildStudentAddressSection(current?.studentName),
        ``,
        `## Lesson content (use the parts about the current theme)`,
        lessonContent || `(not available — continue naturally without inventing lesson quotes)`,
        ``,
        `## "question"`,
        `About the theme, built on what the student just said: make them practice the theme's words or grammar talking about their own life. Open and concrete, never yes/no, never generic ("Ti piace?", "E tu?").`,
        ...QUESTION_EXAMPLES.map((example) => `- ${example}`),
        ``,
        `## Never`,
        `- Never repeat a question already asked in the history (same subject counts as repeated) — pick a fresh angle.`,
        `- Never correct writing (case, punctuation, accents) — only real speech mistakes in "errors".`,
        `- Never go outside the current theme, announce the question mechanically, or mention internal state.`,
        ``,
        `## "response" is spoken (TTS)`,
        `Only letters, spaces, . , ! ? ' and '...'. No other punctuation, no markdown, no line breaks. Quote words with simple single quotes.`,
        ``,
        `Output JSON: { "response": "corrections + one warm line, no question", "question": "one open question about the theme" }`,
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
                `"${theme}" is the NEW theme, "${previousTheme}" just finished. The question MUST be about the NEW theme. No history this turn — don't announce the change, just start fresh.`,
            ]
            : []),
    ].join("\n");

    return { cached, dynamic };
};
