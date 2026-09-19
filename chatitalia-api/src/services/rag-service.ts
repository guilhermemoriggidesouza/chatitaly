import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Neo4jVectorStore } from '@langchain/community/vectorstores/neo4j_vector';
import { runCypher, NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD } from '../infra/neo4j';
import { langchainEmbeddings } from '../infra/embeddings';
import { rag } from '../config';
import logger from '../logger';

const CHUNK_EMBEDDING_PROPERTY = 'embedding';
const CHUNK_TEXT_PROPERTY = 'content';

type ScopeVectorConfig = {
  url: string;
  username: string;
  password: string;
  nodeLabel: string;
  indexName: string;
  embeddingNodeProperty: string;
  textNodeProperty: string;
};

export type RagIngestResult = { scopeId: string; chunksCount: number };

// Só mantém candidatos com score >= 92% do melhor da lista. Corta o "sobrou
// vaga, então enfia qualquer coisa": um scope pequeno (lição) às vezes só tem
// 1-2 chunks realmente sobre o tema, e forçar sempre `k` resultados enfiava
// um chunk de outro assunto (ex.: números) só pra completar. 0.85 não foi
// agressivo o bastante na prática — subiu pra 0.92.
const RELEVANCE_MARGIN = 0.92;

// Agnóstico ao tipo de conteúdo: recebe TEXTO puro, não sabe de PDF/upload/S3
// (quem chama extrai o texto de onde for antes de passar). Também agnóstico
// ao que é `scopeId` — hoje é usado tanto por bookId (RAG do livro inteiro,
// pro answer-node) quanto por lessonId (RAG da lição atual, pro plain-node e
// pro conversational-node).
//
// Cada scope tem seu PRÓPRIO label + índice vetorial no Neo4j — bancos
// fisicamente separados, não um label único com tudo misturado. Community
// não tem multi-database (isso é Enterprise); label por scope é o equivalente
// possível a "um ambiente por livro/lição" e evita que apagar/reingerir um
// chegue perto dos nós de outro.
class RagService {
  private labelFor(scopeId: string): string {
    const safe = scopeId.replace(/[^A-Za-z0-9_]/g, '_');
    return `BookChunk_${safe}`;
  }

  private configFor(scopeId: string): ScopeVectorConfig {
    const nodeLabel = this.labelFor(scopeId);
    return {
      url: NEO4J_URI,
      username: NEO4J_USER,
      password: NEO4J_PASSWORD,
      nodeLabel,
      indexName: `${nodeLabel.toLowerCase()}_vector_index`,
      embeddingNodeProperty: CHUNK_EMBEDDING_PROPERTY,
      textNodeProperty: CHUNK_TEXT_PROPERTY,
    };
  }

  async ingest(scopeId: string, text: string): Promise<RagIngestResult> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: rag.chunkSize,
      chunkOverlap: rag.chunkOverlap,
    });
    const rawChunks = await splitter.splitText(text.replace(/\s+/g, ' ').trim());
    const chunks = rawChunks.filter((chunk) => chunk.trim().length > 20);
    logger.info({ scopeId, chunksCount: chunks.length }, 'ragService.ingest: conteúdo dividido em chunks');

    const config = this.configFor(scopeId);

    // Reingestão: só apaga nós do label DESSE scope — nunca alcança outro.
    await runCypher(`MATCH (n:${config.nodeLabel}) DETACH DELETE n`);

    if (chunks.length) {
      const metadatas = chunks.map((_, index) => ({ scopeId, chunkId: index }));
      await Neo4jVectorStore.fromTexts(chunks, metadatas, langchainEmbeddings, config);
    }

    logger.info({ scopeId, chunksCount: chunks.length }, 'ragService.ingest: concluído (Neo4j)');
    return { scopeId, chunksCount: chunks.length };
  }

  async search(scopeId: string | undefined, query: string, k: number): Promise<string[]> {
    if (!scopeId || !query?.trim()) return [];

    try {
      const store = await Neo4jVectorStore.fromExistingIndex(langchainEmbeddings, this.configFor(scopeId));
      const candidates = await store.similaritySearchWithScore(query, Math.max(k * 3, 8));
      if (!candidates.length) return [];

      const topScore = candidates[0][1];
      const relevant = candidates.filter(([, score]) => score >= topScore * RELEVANCE_MARGIN);

      logger.info(
        {
          scopeId,
          query,
          candidates: candidates.map(([doc, score]) => ({
            score,
            kept: score >= topScore * RELEVANCE_MARGIN,
            preview: doc.pageContent.slice(0, 80),
          })),
        },
        'ragService.search: candidatos e scores',
      );

      return relevant.slice(0, k).map(([doc]) => doc.pageContent).filter(Boolean);
    } catch (error) {
      logger.error({ error, scopeId }, 'ragService.search falhou');
      return [];
    }
  }
}

export const ragService = new RagService();
