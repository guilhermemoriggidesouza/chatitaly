import { Embeddings } from '@langchain/core/embeddings';
import { rag } from '../config';
import logger from '../logger';

// Embeddings locais (transformers.js): sem API/chave, sem custo por token.
// Modelo multilíngue (100+ línguas, inclui italiano e português) — serve
// tanto pro conteúdo do livro (italiano) quanto pra fala do aluno (PT/IT).
let embedderPromise: Promise<any> | null = null;

async function getEmbedder() {
  if (!embedderPromise) {
    // import dinâmico: @xenova/transformers é ESM-only.
    embedderPromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', rag.embeddingModel, { quantized: true }),
    );
  }
  return embedderPromise;
}

export class EmbeddingsService {
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const embedder = await getEmbedder();
    const vectors: number[][] = [];
    for (const text of texts) {
      const output = await embedder(text, { pooling: 'mean', normalize: true });
      vectors.push(Array.from(output.data as Float32Array));
    }
    return vectors;
  }

  async embedOne(text: string): Promise<number[] | null> {
    if (!text?.trim()) return null;
    try {
      const [vector] = await this.embed([text]);
      return vector ?? null;
    } catch (error) {
      logger.error({ error }, 'EmbeddingsService: falha ao gerar embedding');
      return null;
    }
  }
}

export const embeddings = new EmbeddingsService();

// Adapter pro formato que o Neo4jVectorStore (langchain) espera. É só isso:
// embedDocuments/embedQuery em cima do mesmo EmbeddingsService de sempre.
export class LangChainEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  embedDocuments(documents: string[]): Promise<number[][]> {
    return embeddings.embed(documents);
  }

  async embedQuery(document: string): Promise<number[]> {
    return (await embeddings.embedOne(document)) ?? [];
  }
}

export const langchainEmbeddings = new LangChainEmbeddings();
