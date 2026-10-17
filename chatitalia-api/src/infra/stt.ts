import { config } from '../config';
import logger from '../logger';

// O provider identifica o formato pela extensão do arquivo enviado.
const extensionFor = (mimetype: string): string => {
  if (mimetype.includes('ogg') || mimetype.includes('opus')) return 'ogg';
  if (mimetype.includes('mpeg') || mimetype.includes('mp3')) return 'mp3';
  if (mimetype.includes('mp4') || mimetype.includes('m4a') || mimetype.includes('aac')) return 'm4a';
  if (mimetype.includes('webm')) return 'webm';
  return 'wav';
};

// Dica de contexto pro modelo: o aluno mistura italiano e português, e a
// transcrição precisa manter os erros (é com eles que o Don corrige).
const TRANSCRIBE_PROMPT =
  "Studente brasiliano che impara l'italiano: parla in italiano, a volte in portoghese. Trascrivi esattamente, senza correggere gli errori.";

// Palavra solta ("Sì") às vezes volta em chinês/coreano/japonês. O aluno só
// fala italiano ou português, então isso é tratado como "não entendi".
const hasAsianScript = (text: string) => /[぀-ヿ㐀-鿿가-힯]/.test(text);

export class STTService {
  // `audio` = Buffer do áudio. Padrão WAV (16kHz mono, o que o front envia);
  // o WhatsApp manda OGG/Opus — aí passe o `mimetype` da mensagem.
  // Devolve '' quando não deu pra entender (o front pede pra regravar).
  async transcribe(audio: Buffer, mimetype: string = 'audio/wav'): Promise<string> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(audio)], { type: mimetype.split(';')[0] }),
      `audio.${extensionFor(mimetype)}`,
    );
    form.append('model', config.sttModel || 'openai/gpt-4o-mini-transcribe');
    form.append('response_format', 'json');
    form.append('temperature', '0');
    form.append('prompt', TRANSCRIBE_PROMPT);

    const res = await fetch(`${config.baseURL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text();
      logger.error({ status: res.status, detail }, 'STT (OpenRouter) falhou');
      throw new Error(`openrouter ${res.status}`);
    }

    const data: any = await res.json();
    const text = String(data.text || '').replace(/\s+/g, ' ').trim();

    if (hasAsianScript(text)) {
      logger.warn({ text }, 'STT: transcrição em escrita asiática, descartada');
      return '';
    }

    return text;
  }
}
