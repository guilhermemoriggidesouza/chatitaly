import { waha as wahaConfig } from '../config';
import { TTSService } from './tts';
import logger from '../logger';

// Número brasileiro pode estar com ou sem o 9 extra no WhatsApp: devolve as
// duas formas, pra comparar com o que está salvo no banco.
export function phoneVariants(phone: string): string[] {
  const match = phone.match(/^55(\d{2})9?(\d{8})$/);
  return match ? [`55${match[1]}9${match[2]}`, `55${match[1]}${match[2]}`] : [phone];
}

// Cliente do WAHA (API não oficial do WhatsApp, container `waha`).
// Quantas vezes tentar uma chamada ao WAHA e quanto esperar entre elas (ms).
const RETRY_DELAYS = [2000, 5000];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WahaService {
  // Chama o WAHA. A conexão dele com o WhatsApp às vezes cai por alguns
  // segundos e volta sozinha; nesse intervalo o WAHA responde 5xx
  // ("Connection Closed"). Por isso erro 5xx e falha de rede são tentados de
  // novo depois de uma pausa. Erro 4xx (sessão errada, número inválido) não
  // adianta repetir e sobe na hora.
  private async request<T = any>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(`${wahaConfig.baseURL}${path}`, {
          method,
          headers: {
            'X-Api-Key': wahaConfig.apiKey,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        const text = await res.text();
        if (res.ok) return (text ? JSON.parse(text) : undefined) as T;

        const error: any = new Error(`waha ${res.status}: ${text.slice(0, 300)}`);
        error.retryable = res.status >= 500;
        throw error;
      } catch (error: any) {
        const retryable = error.retryable ?? true; // sem `retryable` = falha de rede
        if (!retryable || attempt >= RETRY_DELAYS.length) throw error;
        logger.warn({ path, attempt: attempt + 1, error: error.message.slice(0, 120) }, 'WAHA falhou; tentando de novo');
        await wait(RETRY_DELAYS[attempt]);
      }
    }
  }

  // chatId do WhatsApp pra um telefone (só dígitos, com DDI). Null se o
  // número não tem WhatsApp.
  async findChatId(phone: string): Promise<string | null> {
    const query = new URLSearchParams({ phone, session: wahaConfig.session });
    const contact = await this.request<{ numberExists: boolean; chatId?: string }>(
      'GET',
      `/api/contacts/check-exists?${query}`,
    );
    return contact?.numberExists && contact.chatId ? contact.chatId : null;
  }

  // Caminho inverso: telefone (só dígitos, com DDI) a partir do chatId de uma
  // mensagem recebida. O WhatsApp às vezes manda um id interno (@lid) no
  // lugar do número; o WAHA traduz. Null pra grupo, status e canal.
  async phoneFromChatId(chatId: string): Promise<string | null> {
    if (chatId.endsWith('@c.us')) return chatId.replace('@c.us', '');
    if (chatId.endsWith('@lid')) {
      const result = await this.request<{ pn?: string }>(
        'GET',
        `/api/${wahaConfig.session}/lids/${encodeURIComponent(chatId)}`,
      );
      return result?.pn ? result.pn.replace('@c.us', '') : null;
    }
    return null;
  }

  // Baixa a mídia de uma mensagem recebida (`payload.media.url`). A URL vem
  // com o host que o WAHA enxerga (localhost:3000 do container), então só o
  // caminho é aproveitado.
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    const { pathname } = new URL(mediaUrl);
    const res = await fetch(`${wahaConfig.baseURL}${pathname}`, {
      headers: { 'X-Api-Key': wahaConfig.apiKey },
    });
    if (!res.ok) throw new Error(`waha ${res.status} ao baixar mídia`);
    return Buffer.from(await res.arrayBuffer());
  }

  // Mostra "digitando..." na conversa enquanto `task` roda. O WhatsApp apaga
  // o indicador sozinho depois de alguns segundos, então ele é renovado até
  // a tarefa terminar. Falha no indicador nunca derruba a tarefa.
  async withTyping<T>(chatId: string, task: () => Promise<T>): Promise<T> {
    const body = { session: wahaConfig.session, chatId };
    const startTyping = () => this.request('POST', '/api/startTyping', body).catch(() => undefined);

    await startTyping();
    const refresh = setInterval(startTyping, 8000);
    try {
      return await task();
    } finally {
      clearInterval(refresh);
      await this.request('POST', '/api/stopTyping', body).catch(() => undefined);
    }
  }

  async sendText(chatId: string, text: string): Promise<void> {
    await this.request('POST', '/api/sendText', { session: wahaConfig.session, chatId, text });
  }

  // Imagem PNG (base64) com legenda.
  async sendImage(chatId: string, pngBase64: string, caption: string): Promise<void> {
    await this.request('POST', '/api/sendImage', {
      session: wahaConfig.session,
      chatId,
      file: { mimetype: 'image/png', filename: 'verbo.png', data: pngBase64 },
      caption,
    });
  }

  // Mensagem de voz a partir de um WAV em base64; o WAHA converte pra OGG/Opus.
  async sendVoice(chatId: string, wavBase64: string): Promise<void> {
    await this.request('POST', '/api/sendVoice', {
      session: wahaConfig.session,
      chatId,
      file: { mimetype: 'audio/wav', filename: 'don.wav', data: wavBase64 },
      convert: true,
    });
  }

  // Texto + o mesmo texto na voz do Don (Piper). Devolve se o áudio foi
  // enviado: sem Piper instalado, vai só o texto.
  async sendTextAndVoice(chatId: string, text: string): Promise<boolean> {
    await this.sendText(chatId, text);

    const dataUri = await new TTSService().synthesize(text);
    const wavBase64 = dataUri.split(',')[1];
    if (!wavBase64) return false;

    await this.sendVoice(chatId, wavBase64);
    return true;
  }
}

export const wahaService = new WahaService();
