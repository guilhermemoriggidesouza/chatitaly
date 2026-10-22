import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import './src/infra/pdfjs-compat';
import * as pdfjsLib from 'pdfjs-dist';
import { LLMService } from './src/infra/llm';
import { buildPdfSummaryPrompt } from './src/prompts/pdf-summary-agent';
// Descartável: mesmo passo do /pdf/process (20 primeiras páginas + prompt do sumário).
(async () => {
  const file = process.argv[2];
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fs.readFileSync(file)), disableWorker: true, standardFontDataUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/') } as any).promise;
  let text = '';
  for (let n = 1; n <= Math.min(20, pdf.numPages); n++) {
    text += `\n--- Page ${n} ---\n` + (await (await pdf.getPage(n)).getTextContent()).items.map((i: any) => i.str).join(' ');
  }
  const res = await new LLMService().run<any>(buildPdfSummaryPrompt(text), text, true);
  const d = res.data;
  console.log(`RESULT ${path.basename(file).slice(0, 40)} | ${pdf.numPages} págs | toc: ${d?.toc_found} | offset: ${d?.page_offset} | ${d?.chapters?.length} lições`);
  for (const c of d?.chapters ?? []) console.log(`RESULT    ${c.order}. ${c.title} (${c.start_page}-${c.end_page})`);
  if (d?.notes) console.log('RESULT    notas:', String(d.notes).slice(0, 200));
})();
