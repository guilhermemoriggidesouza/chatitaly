import { getCeliReference } from '../data/celi';

// Complexidade das frases que o Don gera, conforme o nível do aluno. Entra
// como uma seção nos prompts de conversa (answer e conversational):
// A1/A2 = facílimo entendimento, B1/B2 = média complexidade, C1/C2 = extrema.
// Nível com referência do CELI (data/celi): a gramática e o vocabulário da
// prova daquele nível viram o limite do que o Don usa.
const COMPLEXITY_BY_LEVEL: Record<string, string> = {
    A1: `EXTREMELY EASY. Only the presente indicativo (plus imperativo and infinito when natural) and the most common everyday words. One idea per sentence, at most about 8 words, subject + verb + complement. No subordinate clauses, no idioms, no rare words.`,
    A2: `VERY EASY. Presente, passato prossimo and futuro semplice (plus courtesy forms like "vorrei" and the common imperatives) only, with common everyday vocabulary. Short sentences, at most one simple connector ("e", "ma", "perché"). No idioms, no rare words.`,
    B1: `MEDIUM. Presente, passato prossimo, imperfetto and futuro semplice, condizionale presente for polite requests and wishes, imperativo (also the formal Lei). Normal-length sentences with common subordinate clauses ("che", "quando", "se", "perché") and the right sequence of tenses. A few very common expressions are fine.`,
    B2: `MEDIUM-HIGH. All the indicative tenses, condizionale presente and passato, congiuntivo where natural (completive, indirect questions, periodo ipotetico), passive and impersonal forms, gerundio and preposition + infinitive, richer vocabulary and connectors ("tuttavia", "quindi", "nonostante"). Still clear and direct.`,
    C1: `VERY HIGH. Sophisticated vocabulary, idioms, long articulated sentences with several subordinate clauses, full use of congiuntivo, periodo ipotetico and passato remoto where it fits.`,
    C2: `EXTREME. Native-level Italian: rare and precise vocabulary, proverbs and nuanced idioms, complex syntax, formal or literary register where it fits. Do not simplify anything.`,
};

// Sem nível (ou nível desconhecido), vale a regra do A1: o mais fácil possível.
export const buildLevelComplexitySection = (level?: string): string[] => {
    const normalized = (level || '').toUpperCase();
    const known = COMPLEXITY_BY_LEVEL[normalized] ? normalized : 'A1';

    const celi = getCeliReference(known);

    return [
        `## Sentence complexity (student level: ${COMPLEXITY_BY_LEVEL[normalized] ? normalized : 'unknown, treat as A1'})`,
        `Every Italian sentence you write, in "response" and in "question", must be: ${COMPLEXITY_BY_LEVEL[known]}`,
        ...(celi
            ? [
                `Stay inside the official ${celi.exam} syllabus: use only these structures and vocabulary, and when you correct, explain only with them.`,
                `- Grammar: ${celi.grammar.join('; ')}.`,
                `- Vocabulary: ${celi.vocabulary}.`,
                `When it fits the conversation, make your question resemble the exam's speaking tasks:`,
                ...celi.tasks.filter((task) => task.startsWith('orale:')).map((task) => `  - ${task.replace(/^orale:\s*/, '')}`),
            ]
            : []),
    ];
};
