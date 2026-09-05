import { config } from '../config';
import logger from '../logger';

// STT via OpenRouter (endpoint OpenAI-compatível /audio/transcriptions).
// Escalável, sem binário local. Provider fixado (Groq) para latência baixa.

// Whisper "alucina" texto em trechos de silêncio/pausa (o clássico "Grazie",
// "Grazie mille", "..."). NÃO dá para simplesmente apagar "grazie" da string:
// o aluno pode ter dito "grazie" de verdade. Em vez disso pedimos
// `verbose_json` e descartamos SEGMENTOS que o próprio Whisper marca como
// "sem fala" (no_speech_prob alto) ou de confiança baixíssima (avg_logprob
// muito negativo) ou repetição (compression_ratio alto). Um "grazie" real vem
// com no_speech_prob baixo e é mantido.
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

export class STTService {
  // `wav` = Buffer de áudio WAV (16kHz mono, o que o front envia).
  async transcribe(wav: Buffer): Promise<string> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'audio.wav');
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
