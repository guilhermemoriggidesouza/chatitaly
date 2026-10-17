export interface LLMConfig {
  apiKey?: string;
  /** Modelo padrão (jobs de PDF/lição). */
  model?: string;
  /** error-node: só lista erros — modelo mais barato. */
  errorModel?: string;
  /** plain-node: decide advance/final_response — modelo médio, mais fiel a regra. */
  plannerModel?: string;
  /** response-node: gera a fala final do Don pro aluno — modelo um pouco melhor. */
  responseModel?: string;
  temperature?: number;
  httpReferer?: string;
  xTitle?: string;
  baseURL?: string;
  /** Modelo de transcrição (STT) — endpoint de áudio OpenAI-compatível do OpenRouter. */
  sttModel?: string;
  /** Provider(s) do OpenRouter para o STT, em ordem. Groq é o mais rápido. */
  sttProviderOrder?: string[];
  /** Como o OpenRouter escolhe o provedor do chat: 'price' (mais barato),
   *  'throughput' (mais rápido) ou 'latency'. Sempre com fallback. */
  providerSort?: 'price' | 'throughput' | 'latency';
}

export interface TTSConfig {
  /** Liga/desliga a voz do Don gerada no servidor (Piper). */
  enabled: boolean;
  /** Caminho do binário do Piper. */
  piperBin: string;
  /** Caminho do modelo .onnx da voz (o .onnx.json fica ao lado). */
  piperModel: string;
}

export interface MongoDBConfig {
  uri: string;
  dbName: string;
}

const mongoUri = process.env.MONGODB_URI || 'mongodb://root:example@localhost:27017';
const mongoDbName = process.env.MONGODB_DB_NAME || 'chatitalia';

export const mongodb: MongoDBConfig = {
  uri: mongoUri,
  dbName: mongoDbName,
};

export const config: LLMConfig = {
  apiKey: process.env.OPENROUTER_API_KEY,
  // Modelo padrão (jobs de PDF/lição, fora do grafo de chat).
  model: 'anthropic/claude-haiku-5.5',
  // Um modelo por node do grafo: barato -> médio -> um pouco melhor.
  errorModel: 'anthropic/claude-haiku-5.5',
  plannerModel: 'anthropic/claude-haiku-5.5',
  responseModel: 'anthropic/claude-haiku-5.5',
  sttModel: 'openai/gpt-4o-mini-transcribe',
  sttProviderOrder: ['groq'],
  httpReferer: '',
  xTitle: 'IA Devs - Transforming Services into Tools',
  temperature: 0.3,
  baseURL: 'https://openrouter.ai/api/v1',
  // Entre os provedores do modelo, escolhe o de menor latência (com fallback).
  providerSort: 'latency',
};

export interface RagConfig {
  /** Tamanho do chunk (chars) e sobreposição entre chunks consecutivos. */
  chunkSize: number;
  chunkOverlap: number;
  /** topK da busca #1: baseada na mensagem do aluno, usada por error/plain. */
  topKMessage: number;
  /** topK da busca #2: baseada no tema atual, usada pelo response-node. */
  topKTheme: number;
  /** Modelo de embeddings local (transformers.js, roda no processo, sem API). */
  embeddingModel: string;
}

export const rag: RagConfig = {
  chunkSize: 1000,
  chunkOverlap: 150,
  topKMessage: 4,
  topKTheme: 4,
  embeddingModel: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
};

// Piper (TTS) roda local: binário no PATH (Docker faz symlink; no Mac use
// `pip install piper-tts`). O modelo é o caminho do container; se não existir,
// o TTSService cai para `chatitalia-api/models/<arquivo>` (dev local).
export const tts: TTSConfig = {
  enabled: true,
  piperBin: 'piper',
  // `riccardo` é a única voz masculina italiana do Piper e só existe em x_low
  // (soa fina). O pitch abaixo dá corpo/gravidade de voz masculina.
  piperModel: '/opt/voices/it_IT-riccardo-x_low.onnx',
};

export interface WahaConfig {
  /** URL do WAHA (API do WhatsApp). */
  baseURL: string;
  /** Chave da API do WAHA (header X-Api-Key). */
  apiKey: string;
  /** Nome da sessão no dashboard do WAHA (o número logado via QR code). */
  session: string;
  /** Celular (só dígitos, com DDI) que recebe os avisos administrativos. Vem só do ambiente (WAHA_ADMIN_PHONE): nenhum número fica no repositório. */
  adminPhone: string;
  /** Chave HMAC do webhook: a mesma configurada no webhook da sessão do WAHA. */
  webhookHmacKey: string;
}

// WAHA roda em container: local em localhost:3001, na VM em http://waha:3000.
export const waha: WahaConfig = {
  baseURL: process.env.WAHA_URL || 'http://localhost:3001',
  apiKey: process.env.WAHA_API_KEY || '',
  session: process.env.WAHA_SESSION || 'default',
  adminPhone: process.env.WAHA_ADMIN_PHONE || '',
  webhookHmacKey: process.env.WAHA_WEBHOOK_HMAC_KEY || '',
};

export interface WhatsScheduleConfig {
  /** Endereço público do site, usado nos links das mensagens. */
  appUrl: string;
  /** Tolerância (min) para enviar atrasado se o worker estava fora na hora marcada. */
  catchUpMinutes: number;
  /** Chromium usado pra tirar o print do cartão do verbo. */
  chromePath: string;
}

// No container é o Chromium do apt; no Mac, o Chrome instalado.
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Agendador de verbos/lições no WhatsApp (fila `whatsapp-schedule`, no worker).
export const whatsSchedule: WhatsScheduleConfig = {
  appUrl: process.env.APP_URL || 'https://donitaliano.yourlesson.online',
  catchUpMinutes: 10,
  chromePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? MAC_CHROME : '/usr/bin/chromium'),
};
