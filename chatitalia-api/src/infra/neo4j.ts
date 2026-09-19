import neo4j, { Driver } from 'neo4j-driver';
import logger from '../logger';

// Conexão com o Neo4j. Por enquanto só o RAG do livro usa isso (ver
// services/rag-service.ts), mas fica genérico pra outros usos.
// Exportadas pra rag-constants.ts montar o config do Neo4jVectorStore sem duplicar.
export const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
export const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
export const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'changeme123';

const uri = NEO4J_URI;
const user = NEO4J_USER;
const password = NEO4J_PASSWORD;

let driver: Driver | null = null;

export async function connectNeo4j(): Promise<void> {
  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    await driver.verifyConnectivity();
    logger.info({ uri }, 'Connected to Neo4j');
  } catch (error) {
    logger.error({ error, uri }, 'Failed to connect to Neo4j');
    throw error;
  }
}

export async function disconnectNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    logger.info('Disconnected from Neo4j');
  }
}

// Roda uma query Cypher e devolve os registros já como objetos simples.
export async function runCypher<T = any>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
  if (!driver) {
    throw new Error('Neo4j not connected. Call connectNeo4j() first.');
  }
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject()) as T[];
  } finally {
    await session.close();
  }
}
