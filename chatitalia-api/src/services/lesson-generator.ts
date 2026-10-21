import path from 'path';
import '../infra/pdfjs-compat';
import * as pdfjsLib from 'pdfjs-dist';
import { s3 } from '../infra/s3';
import { LLMService } from '../infra/llm';
import { buildLessonGeneratorPrompt, LESSON_REVIEW_PROMPT } from '../prompts/lesson-generator';
import { levelsForBook } from '../data/book-levels';
import { getCeliReference } from '../data/celi';
import logger from '../logger';

// Texto cru das páginas do capítulo (`lesson.pages`) no PDF do livro.
export async function extractChapterText(lesson: { fileUri: string; pages?: number[] }): Promise<string> {
  const fileBuffer = await s3.getObject(lesson.fileUri);
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(fileBuffer),
    disableWorker: true,
    standardFontDataUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/'),
  } as any).promise;

  let text = '';
  for (const pageNum of lesson.pages || []) {
    if (pageNum >= 1 && pageNum <= pdf.numPages) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      text += `\n--- Page ${pageNum} ---\n${textContent.items.map((item: any) => item.str).join(' ')}`;
    }
  }
  return text;
}

// Escreve a lição (Markdown) a partir do texto do capítulo e revisa os erros,
// com a referência
// do CELI dos níveis do livro (1º livro = A1/A2...; só os níveis cadastrados
// em data/celi). Usado pelo worker e pelo script de regerar lições.
export async function generateLessonMarkdown(lesson: { lessonId: string; bookId?: string }, chapterText: string): Promise<string> {
  const bookLevels = await levelsForBook(lesson.bookId);
  const celi = bookLevels.map(getCeliReference).filter((ref) => ref !== undefined);
  logger.info({ lessonId: lesson.lessonId, bookLevels, celiLevels: celi.map((ref) => ref.level) }, 'CELI reference for lesson');

  const llm = new LLMService();
  const draft = await llm.run<string>(
    buildLessonGeneratorPrompt(chapterText, celi),
    'Write the complete lesson in Markdown now: explanations in Brazilian Portuguese, Italian for every example, word and sentence being taught.',
    false,
  );
  if (!draft.success || !draft.data) {
    throw new Error(`Failed to generate lesson: ${draft.error}`);
  }

  // Revisão de erros. Se ela falhar (ou vier vazia), fica o rascunho.
  const reviewed = await llm.run<string>(LESSON_REVIEW_PROMPT, draft.data, false);
  if (!reviewed.success || !reviewed.data?.trim()) {
    logger.warn({ lessonId: lesson.lessonId, error: reviewed.error }, 'Revisão da lição falhou; usando o rascunho');
    return draft.data;
  }
  return reviewed.data;
}
