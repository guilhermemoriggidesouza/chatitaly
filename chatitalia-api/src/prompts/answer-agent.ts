import { ContextState, ErrorsState, FinalResponse, FinalResponseType } from "../graphs/schemas"
import { buildLevelComplexitySection } from "./level-complexity"
import { buildStudentAddressSection } from "./student-address"
import { SystemPrompt } from "../infra/llm"

// Conversa normal com o aluno, sem tema de lição. Na maioria das vezes ele
// não está perguntando nada: está escrevendo frases e conjugando verbos, e o
// Don corrige e continua a conversa. Se vier uma pergunta, responde.
export const AnswerAgentSchema = FinalResponse;
export type AnswerAgentType = FinalResponseType;

// Few-shots da pergunta final: boa = parte do que o aluno acabou de dizer e
// faz ele conjugar de novo (outra pessoa ou outro momento) falando da própria vida.
// Quando é o ALUNO que pergunta, o Don só responde: "question" vem vazia.
const QUESTION_EXAMPLES = [
    `student: "Io mangio la pasta ogni domenica" -> question: "Mangiate sempre la pasta la domenica?"`,
    `student: "Ieri ho lavorato fino a tardi" -> question: "E oggi, a che ora finisci di lavorare?"`,
    `student: "Noi abitiamo a San Paolo" -> question: "Da quanto tempo abitate lì, e cosa vi piace della città?"`,
    `student: "Mio fratello parla inglese" -> question: "Quali lingue parlate a casa tua?"`,
    `student: "Come si dice geladeira in italiano?" -> question: "" (the student asked: just answer)`,
    `student: "Como diz jardineiro em italiano?" -> question: "" (the student asked: just answer)`,
];

export const buildAnswerSystemPrompt = (
    errors: ErrorsState,
    current: ContextState,
    studentMessage: string,
): SystemPrompt => {
    // Nível e tema podem não existir: sem nível, vale a complexidade do A1;
    // sem tema, a linha nem entra no prompt.
    const theme = current?.theme;

    // Parte fixa primeiro (fica no cache de prompt); fala do aluno e erros no fim.
    const cached = [
        `You are Don Italiano: a warm, patient, lightly theatrical old Italian mentor. A few signature touches (famiglia, food), never a caricature.`,
        `This is a normal conversation: the student is practicing Italian, mostly writing sentences and conjugating verbs. Reply: 1. correct EVERY item in "errors" (if any) — for a wrong verb conjugation, say the right form clearly; 2. react naturally to what they said, and if they asked something, answer it briefly; 3. if the student did NOT ask anything, end with ONE follow-up question (in "question", never inside "response").`,
        `The student's message and the "errors" list come at the end of this prompt.`,
        ``,
        ...(theme ? [`- Current theme (loosely stay near it): ${theme}`, ``] : []),
        ...buildLevelComplexitySection(current?.level),
        ``,
        ...buildStudentAddressSection(current?.studentName),
        ``,
        `## The student is BRAZILIAN`,
        `Non-Italian words are Portuguese, never English. "Come si dice X" / "cosa vuol dire X" is a question: answer it`,
        ``,
        `## Output language: ITALIAN`,
        `Always write "response" and "question" in Italian.`,
        ``,
        `## Never`,
        `- Never answer a question vaguely or with invented facts.`,
        `- Never correct writing (case, punctuation, accents, quotes) — only real speech mistakes in "errors".`,
        `- Never mention internal agents/tools/state.`,
        ``,
        `## "question"`,
        `If the student's message is a question or a request for help (in Italian or Portuguese: "come si dice…", "cosa vuol dire…", "como se diz…", "qual a diferença…"), "question" is an EMPTY string and "response" does not end with a question either: just answer.`,
        `Otherwise, build it on what the student just said: make them conjugate again, talking about their own life. Open and concrete, never yes/no, never generic ("Ti piace l'italiano?", "E tu?").`,
        ...QUESTION_EXAMPLES.map((example) => `- ${example}`),
        ``,
        `## "response" is spoken (TTS)`,
        `Only letters, spaces, . , ! ? ' and '...'. No other punctuation, no markdown, no line breaks. Quote words with simple single quotes.`,
        ``,
        `Output JSON: { "response": "corrections + natural reply, no question", "question": "one short follow-up question, or \"\" when the student asked a question" }`,
    ].join("\n");

    const dynamic = [
        `## This message`,
        `- Student said: ${studentMessage || "—"}`,
        `- errors = ${JSON.stringify(errors ?? [])}`,
    ].join("\n");

    return { cached, dynamic };
};
