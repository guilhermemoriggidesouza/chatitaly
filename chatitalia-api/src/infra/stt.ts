import { config } from '../config';
import logger from '../logger';

// Formato do áudio pro `input_audio` do modelo.
const formatFor = (mimetype: string): string => {
  if (mimetype.includes('ogg') || mimetype.includes('opus')) return 'ogg';
  if (mimetype.includes('mpeg') || mimetype.includes('mp3')) return 'mp3';
  if (mimetype.includes('mp4') || mimetype.includes('m4a') || mimetype.includes('aac')) return 'm4a';
  if (mimetype.includes('webm')) return 'webm';
  return 'wav';
};

// A transcrição é feita por um modelo de chat que OUVE o áudio (Gemini), não
// pela rota /audio/transcriptions: o OpenRouter ignorava prompt e idioma lá, e
// "ho venti anni" virava "Ó vinte anos" / "O venchian". Aqui as instruções e a
// última fala do Don valem de verdade.
const TRANSCRIBE_SYSTEM = [
  `Sei un trascrittore. Uno studente BRASILIANO che impara l'italiano ha inviato un messaggio vocale (di solito in italiano, a volte con parole in portoghese).`,
  `Trascrivi le parole che ha detto con l'ortografia italiana standard (es. "ho", "hanno", "perché", "residenza"). Scrivi i numeri in lettere ("venti", non "20").`,
  `Le parole portoghesi restano in portoghese.`,
  `Rispondi SOLO con la trascrizione, senza virgolette né commenti. Se non si capisce niente, rispondi solo "-".`,
].join('\n');

// Palavra solta ("Sì") às vezes volta em chinês/coreano/japonês. O aluno só
// fala italiano ou português, então isso é tratado como "não entendi".
const hasAsianScript = (text: string) => /[぀-ヿ㐀-鿿가-힯]/.test(text);

const TIMEOUT_MS = 20000;

export class STTService {
  // `audio` = Buffer do áudio. Padrão WAV (16kHz mono, o que o front envia);
  // o WhatsApp manda OGG/Opus — aí passe o `mimetype` da mensagem.
  // `lastDonMessage` = última fala do Don: ajuda a entender o que foi dito.
  // Devolve '' quando não deu pra entender (o front pede pra regravar).
  async transcribe(audio: Buffer, mimetype: string = 'audio/wav', lastDonMessage?: string): Promise<string> {
    const context = (lastDonMessage || '').slice(0, 600);

    const res = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: config.sttModel || 'google/gemini-3.5-flash-lite',
        temperature: 0,
        provider: { sort: 'latency', allow_fallbacks: true },
        messages: [
          { role: 'system', content: TRANSCRIBE_SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: context ? `Ultimo messaggio del Don: "${context}"` : 'Trascrivi:' },
              { type: 'input_audio', input_audio: { data: audio.toString('base64'), format: formatFor(mimetype) } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      logger.error({ status: res.status, detail }, 'STT (OpenRouter) falhou');
      throw new Error(`openrouter ${res.status}`);
    }

    const data: any = await res.json();
    const text = String(data.choices?.[0]?.message?.content || '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^["«“]|["»”]$/g, '');

    if (!text || text === '-') return '';

    if (hasAsianScript(text)) {
      logger.warn({ text }, 'STT: transcrição em escrita asiática, descartada');
      return '';
    }

    logger.info({ text, context: Boolean(context) }, 'STT: áudio transcrito');
    return text;
  }
}
