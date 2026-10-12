import { config } from '../config';
import logger from '../logger';

type WhisperSegment = {
  text?: string;
  no_speech_prob?: number;
  avg_logprob?: number;
  compression_ratio?: number;
};

const NO_SPEECH_MAX = 0.6; // acima disso, Whisper acha que é silêncio
const AVG_LOGPROB_MIN = -1.0; // abaixo disso, praticamente ruído
const COMPRESSION_RATIO_MAX = 2.4; // acima disso, loop de repetição

const isHallucinatedSegment = (seg: WhisperSegment): boolean => {
  const noSpeech = typeof seg.no_speech_prob === 'number' ? seg.no_speech_prob : 0;
  const avgLogprob = typeof seg.avg_logprob === 'number' ? seg.avg_logprob : 0;
  const compression = typeof seg.compression_ratio === 'number' ? seg.compression_ratio : 0;
  return (
    noSpeech >= NO_SPEECH_MAX ||
    avgLogprob <= AVG_LOGPROB_MIN ||
    compression >= COMPRESSION_RATIO_MAX
  );
};

// O provider identifica o formato pela extensão do arquivo enviado.
const extensionFor = (mimetype: string): string => {
  if (mimetype.includes('ogg') || mimetype.includes('opus')) return 'ogg';
  if (mimetype.includes('mpeg') || mimetype.includes('mp3')) return 'mp3';
  if (mimetype.includes('mp4') || mimetype.includes('m4a') || mimetype.includes('aac')) return 'm4a';
  if (mimetype.includes('webm')) return 'webm';
  return 'wav';
};

export class STTService {
  // `audio` = Buffer do áudio. Padrão WAV (16kHz mono, o que o front envia);
  // o WhatsApp manda OGG/Opus — aí passe o `mimetype` da mensagem.
  async transcribe(audio: Buffer, mimetype: string = 'audio/wav'): Promise<string> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(audio)], { type: mimetype.split(';')[0] }),
      `audio.${extensionFor(mimetype)}`,
    );
    form.append('model', config.sttModel || 'openai/whisper-large-v3-turbo');
    form.append('language', 'it');
    form.append('response_format', 'verbose_json'); // precisa dos segmentos + probs
    form.append('temperature', '0'); // menos alucinação
    if (config.sttProviderOrder?.length) {
      form.append(
        'provider',
        JSON.stringify({ order: config.sttProviderOrder, allow_fallbacks: true }),
      );
    }

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
    const fullText = String(data.text || '').trim();

    // Sem segmentos (provider não devolveu verbose_json): usa o texto cru.
    if (!Array.isArray(data.segments) || data.segments.length === 0) {
      return fullText;
    }

    const kept: string[] = [];
    const dropped: string[] = [];
    for (const seg of data.segments as WhisperSegment[]) {
      const segText = String(seg.text || '').trim();
      if (!segText) continue;
      if (isHallucinatedSegment(seg)) {
        dropped.push(segText);
      } else {
        kept.push(segText);
      }
    }

    if (dropped.length) {
      logger.info({ dropped, kept }, 'STT: segmentos de silêncio/alucinação descartados');
    }

    // Tudo era silêncio/alucinação -> devolve vazio (o front pede pra regravar).
    return kept.join(' ').replace(/\s+/g, ' ').trim();
  }
}
