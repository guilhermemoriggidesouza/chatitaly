import { CeliReference, formatCeliCompetences } from '../data/celi';

// Gera a lição (Markdown, explicações em pt-BR e exemplos em italiano) a
// partir do texto das páginas do capítulo. O livro dá o assunto e a ordem;
// a lição ENSINA esse assunto (explica, exemplifica, monta tabelas), em vez
// de só resumir. Com referência do CELI do nível do livro, a lição fica
// alinhada ao que a prova cobra e ganha a seção "No CELI".
export const buildLessonGeneratorPrompt = (pdfContent: string, celi: CeliReference[] = []) => {
  return [
    `You are an experienced teacher of Italian for Brazilian students. Turn a chapter of an Italian textbook into a lesson the student reads before practicing a conversation about it.`,
    ``,
    `## The source`,
    `Below is the raw text extracted from the chapter's PDF pages. Layout is lost: tables (e.g. conjugations) may come out as loose words in a row, and there may be page numbers, headers, exercise instructions and audio-track references mixed in. Reconstruct the teaching content; ignore the noise.`,
    ``,
    `## What the lesson must do`,
    `- Teach the topics of THIS chapter, in the chapter's order. The chapter decides WHAT is taught; do not add topics the chapter does not cover.`,
    `- Explain like a good teacher, not a summary: say what each structure is for and when to use it, in simple Brazilian Portuguese.`,
    `- Give plenty of examples in Italian, each with its translation in Portuguese. Add your own natural, everyday examples when the book has few.`,
    `- Rebuild every conjugation, article or pronoun table as a Markdown table, complete (io, tu, lui/lei, noi, voi, loro).`,
    `- For vocabulary, group the words by theme in tables (italiano | português).`,
    `- Point out the typical mistakes of Brazilians on these topics (false friends, Portuguese interference, e.g. "io ho 20 anni" not "io sono 20 anni"), with the right form.`,
    `- Keep every example and rule correct Italian: double-check conjugations, genders and agreement.`,
    ...(celi.length
      ? [
        ``,
        `## Official exam reference (CELI, Università per Stranieri di Perugia)`,
        `This book covers ${celi.map((ref) => ref.level).join(', ')}. Use the reference below to choose what to stress and which examples to give: stay within this level and favor the situations of the exam tasks. Never teach structures above the level.`,
        ...celi.map(formatCeliCompetences),
      ]
      : []),
    ``,
    `## Structure (Markdown)`,
    `- "# " title of the lesson (in Portuguese, may include the Italian topic).`,
    `- A short "## Nesta lição" with what the student will be able to do at the end (2 to 4 bullets).`,
    `- One "## " section per topic of the chapter, with explanation, tables and examples.`,
    `- "## Erros comuns de brasileiros" with the typical mistakes on these topics.`,
    ...(celi.length
      ? [`- "## No CELI": which items of the reference above this lesson covers, in which exam tasks they appear, and one practical tip for the exam. Only items really covered by the lesson.`]
      : []),
    `- "## Resumo" with the key points in a few bullets.`,
    ``,
    `## Never`,
    `- Never include exercises, quizzes, questions to answer or homework: the practice happens in the conversation with the tutor.`,
    `- Never mention video lessons, audio tracks, page numbers or the book's own exercises.`,
    `- Never invent facts about the book (characters, stories, dialogues that are not there). Your own example sentences are welcome.`,
    `- Never return JSON or wrap the lesson in a code block: only the Markdown of the lesson.`,
    ``,
    `## Chapter text`,
    pdfContent,
  ].join('\n');
};

// 2ª passada sobre a lição gerada: o modelo da geração (Haiku) às vezes erra
// regras (sílaba tônica, acento, conjugação) ao completar o capítulo. Uma
// revisão focada só em erros pega a maior parte deles.
export const LESSON_REVIEW_PROMPT = [
  `You are a strict proofreader of Italian-language lessons written for Brazilian students.`,
  `Check every rule, table, example and translation of the lesson for factual mistakes about Italian: wrong stressed syllables, wrong pronunciation rules, wrong accents (grave vs acute), wrong conjugations, genders or agreement, wrong translations, claims that contradict each other, and invented "facts" or anecdotes that are not real Italian usage.`,
  `Fix every mistake in place. Delete a sentence when it cannot be fixed. Do not change anything that is correct, do not add new sections, keep the Markdown structure.`,
  `Return only the full corrected lesson in Markdown.`,
].join('\n');
