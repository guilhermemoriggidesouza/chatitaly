import path from 'path';
import '../infra/pdfjs-compat';
import * as pdfjsLib from 'pdfjs-dist';
import { s3 } from '../infra/s3';

export async function extractFullPdfText(fileUri: string): Promise<string> {
  const fileBuffer = await s3.getObject(fileUri);
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(fileBuffer),
    disableWorker: true,
    standardFontDataUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/'),
  } as any).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return fullText;
}
