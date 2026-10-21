import { z } from 'zod/v3';

// Temas da lição + uma descrição curta de cada um. A descrição vai na pergunta
// do dia do WhatsApp e é o conteúdo que o Don usa na conversa sobre o tema
// (no lugar da lição inteira), então precisa ser completa, mas simples.
export const LessonThemesSchema = z.object({
    themes: z.array(z.object({
        // "italianName" (e não "theme") deixa claro pro modelo que o nome é em
        // italiano: com "theme" ele copiava os títulos em português da lição.
        italianName: z.string(),
        description: z.string(),
    })),
});

export type LessonThemesType = z.infer<typeof LessonThemesSchema>;

export const LESSON_THEMES_SYSTEM_PROMPT = [
    `You split an Italian lesson for Brazilian students into the themes the student will practice in conversation, one by one.`,
    ``,
    `## "themes"`,
    `- The main topics of the lesson, in the lesson's order (usually 3 to 7). Each one must be something the student can practice by talking (a structure, a set of words, a communicative situation).`,
    `- "italianName": short name of the theme, entirely in ITALIAN. The lesson's headings are in Portuguese: never copy them, translate the topic into Italian (e.g. heading "Acento tônico e acento gráfico" -> "l'accento tonico e grafico"; "D e G: sons diferentes" -> "la pronuncia di d e g"; "O verbo ser" -> "il verbo essere"; "Apresentar-se" -> "presentarsi").`,
    ``,
    `## "description"`,
    `A short explanation of the theme in Brazilian Portuguese, taken from the lesson, for someone who has not read it. It will be sent on WhatsApp and it is all the tutor will know about the theme, so it must be complete but simple:`,
    `- what the theme is and when to use it (1 or 2 sentences);`,
    `- the rule or the main forms (e.g. "io sono, tu sei, lui/lei è, noi siamo, voi siete, loro sono");`,
    `- 3 or 4 examples in Italian, each followed by the translation;`,
    `- one typical mistake of Brazilians, with the right form.`,
    `About 100 to 180 words. WhatsApp formatting only: *bold* and simple "- " lists. No Markdown headings, no tables, no links.`,
    `Every rule and example must be correct Italian, and every translation correct Portuguese: double-check conjugations, genders, agreement, accents and that no Italian word is left inside a translation.`,
].join('\n');
