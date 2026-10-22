// Lê o sumário nas primeiras páginas do livro e devolve as LIÇÕES: uma por
// unidade principal do livro, cobrindo todas as páginas dela (inclusive as
// seções extras da unidade, como videocorso e caffè culturale). Exercícios do
// fim do livro, gabaritos, testes, revisões e apêndices ficam de fora.
export const buildPdfSummaryPrompt = (pdfContent: string) => {
  return [
    `You read the first pages of an Italian textbook (raw text extracted from the PDF; each page starts with a "--- Page N ---" marker, where N is the page of the PDF file) and return the list of its lessons, taken from the table of contents.`,
    ``,
    `## What is a lesson`,
    `- One lesson = one MAIN teaching unit of the book (e.g. "Lezione 1", "Unità 3", or a numbered chapter with its own title).`,
    `- A unit often has extra sections listed under it in the table of contents (videocorso, caffè culturale, comunicazione, grammatica of the unit, cultura...). They are PART of that unit: do not list them separately; the unit's page range must include them.`,
    `- The book usually has between 6 and 20 units. Every unit in the table of contents must be in the list, in order, with no gaps.`,
    ``,
    `## Leave out (never a lesson)`,
    `Introduction, index, review sections ("facciamo il punto", "ripasso", "bilancio"), exercise sections at the end of the book ("esercizi", "eserciziario"), answer keys ("chiavi", "soluzioni"), tests and exams, grammar appendix, glossary, audio and video track lists, phonetics tables.`,
    ``,
    `## Pages`,
    `- "start_page": the page where the unit starts; "end_page": the page right before the next unit (or the next left-out section) starts. Use the page numbers printed in the table of contents.`,
    `- "page_offset": the printed page numbers can differ from the PDF pages (unnumbered cover and front pages). Find a page among the ones below whose own printed number is visible (e.g. "LEZIONE 1 | 7" or "16 | CAFFÈ CULTURALE 1" inside "--- Page N ---") and return N minus that printed number. Return 0 when they match or when you cannot tell.`,
    ``,
    `## Titles`,
    `Copy each unit title exactly as written in the table of contents, including its number when it has one (e.g. "Lezione 1 Primi contatti"). Titles must be unique.`,
    ``,
    `## Output (JSON only)`,
    `{ "toc_found": true, "page_offset": 0, "chapters": [ { "title": "Lezione 1 Primi contatti", "start_page": 5, "end_page": 16, "order": 1 } ], "total_chapters": 1, "notes": "anything relevant" }`,
    `If there is no table of contents in these pages: { "toc_found": false, "page_offset": 0, "chapters": [], "total_chapters": 0, "notes": "why" }. Never invent units that are not in the table of contents.`,
  ].join('\n');
};
