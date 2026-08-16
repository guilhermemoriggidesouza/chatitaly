import { MongoClient, Db, Collection } from 'mongodb';
import { mongodb } from '../config';
import logger from '../logger';

export class MongoDBConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    try {
      this.client = new MongoClient(mongodb.uri);
      await this.client.connect();
      this.db = this.client.db(mongodb.dbName);
      logger.info(`Connected to MongoDB at ${mongodb.uri}/${mongodb.dbName}`);
    } catch (error: any) {
      logger.error({ error }, 'Failed to connect to MongoDB');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        logger.info('Disconnected from MongoDB');
      }
    } catch (error: any) {
      logger.error({ error }, 'Failed to disconnect from MongoDB');
      throw error;
    }
  }

  private ensureConnected(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  async insertOne(collection: string, doc: Record<string, any>) {
    const db = this.ensureConnected();
    const col = db.collection(collection);
    const result = await col.insertOne(doc);
    return { _id: result.insertedId, ...doc };
  }

  async insertMany(collection: string, docs: Record<string, any>[]) {
    const db = this.ensureConnected();
    const col = db.collection(collection);
    const result = await col.insertMany(docs);
    return { insertedCount: result.insertedCount, insertedIds: result.insertedIds };
  }

  async find(collection: string, filter: Record<string, any> = {}) {
    const db = this.ensureConnected();
    const col = db.collection(collection);
    return await col.find(filter).toArray();
  }

  async findOne(collection: string, filter: Record<string, any> = {}) {
    const db = this.ensureConnected();
    const col = db.collection(collection);
    return await col.findOne(filter);
  }

  async updateOne(collection: string, filter: Record<string, any>, update: Record<string, any>) {
    const db = this.ensureConnected();
    const col = db.collection(collection);
    const result = await col.updateOne(filter, { $set: update });
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  async deleteOne(collection: string, filter: Record<string, any>) {
    const db = this.ensureConnected();
    const col = db.collection(collection);
    const result = await col.deleteOne(filter);
    return { deletedCount: result.deletedCount };
  }
}

// Default singleton instance
export const mongoDb = new MongoDBConnection();
