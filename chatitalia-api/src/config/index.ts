export interface LLMConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  httpReferer?: string;
  xTitle?: string;
  baseURL?: string;
  /** Provedores OpenRouter, em ordem de preferência (slugs da página do modelo). */
  providerOrder?: string[];
  /** Se false, NÃO cai para outro provedor fora de providerOrder. */
  allowProviderFallbacks?: boolean;
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
  model: 'deepseek/deepseek-v4-flash',
  httpReferer: '',
  xTitle: 'IA Devs - Transforming Services into Tools',
  temperature: 0.3,
  baseURL: 'https://openrouter.ai/api/v1',
  // Fixa o provedor: sempre o mesmo, sem balanceamento. Ajuste o slug conforme
  // a lista de "Providers" na página do modelo na OpenRouter se der 404.
  providerOrder: ['deepseek'],
  allowProviderFallbacks: false,
};
