export interface LLMConfig {
  apiKey?: string;
  /** Modelo padrão do chat (usado pelo Don/responseNode e pelos jobs de PDF/lição). */
  model?: string;
  /** Modelo do planner (plain-agent): decisão + JSON estrito, compensa um modelo mais forte. */
  plannerModel?: string;
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
  apiKey: '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',
  // Don/responseNode: barato e rápido (conversa tolera modelo menor).
  model: 'google/gemini-2.5-flash-lite',
  // Planner: modelo cheio, segue melhor as regras e o JSON estruturado.
  plannerModel: 'google/gemini-2.5-flash',
  sttModel: 'openai/whisper-large-v3-turbo',
  sttProviderOrder: ['groq'],
  httpReferer: '',
  xTitle: 'IA Devs - Transforming Services into Tools',
  temperature: 0.3,
  baseURL: 'https://openrouter.ai/api/v1',
  // Entre os provedores do modelo, escolhe o de maior throughput (com fallback).
  providerSort: 'throughput',
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
