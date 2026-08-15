export interface LLMConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  httpReferer?: string;
  xTitle?: string;
  baseURL?: string;
}

export interface MongoDBConfig {
  uri: string;
  dbName: string;
}

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const mongoDbName = process.env.MONGODB_DB_NAME || 'chatitalia';

export const mongodb: MongoDBConfig = {
  uri: mongoUri,
  dbName: mongoDbName,
};

export const config: LLMConfig = {
  apiKey: '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',
  // model: 'google/gemma-4-26b-a4b-it:free',
  model: 'openrouter/auto-beta',
  httpReferer: '',
  xTitle: 'IA Devs - Transforming Services into Tools',
  temperature: 0.7,
  baseURL: 'https://openrouter.ai/api/v1',
};
