import { config } from '../config';
import logger from '../logger';

// STT via OpenRouter (endpoint OpenAI-compatível /audio/transcriptions).
// Escalável, sem binário local. Provider fixado (Groq) para latência baixa.
export class STTService {
  // `wav` = Buffer de áudio WAV (16kHz mono, o que o front envia).
  async transcribe(wav: Buffer): Promise<string> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'audio.wav');
    form.append('model', config.sttModel || 'openai/whisper-large-v3-turbo');
    form.append('language', 'it');
    form.append('response_format', 'json');
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
    return String(data.text || '').trim();
  }
}
