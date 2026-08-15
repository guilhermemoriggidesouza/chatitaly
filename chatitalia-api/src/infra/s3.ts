import fs from 'fs';
import path from 'path';
import logger from '../logger';

export interface S3Object {
  key: string;
  size: number;
  contentType: string;
  createdAt: string;
}

export class S3Emulator {
  private uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir || path.join(process.cwd(), 'uploads');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Get file from S3 emulator
   * Returns file buffer
   */
  async getObject(key: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.uploadDir, path.basename(key));

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${key}`);
      }

      logger.info({ key, filePath }, 'Retrieving file from S3 emulator');
      const buffer = fs.readFileSync(filePath);
      
      return buffer;
    } catch (error: any) {
      logger.error({ key, error: error.message }, 'Error retrieving file from S3 emulator');
      throw error;
    }
  }

  /**
   * Get file stream from S3 emulator
   */
  getObjectStream(key: string) {
    try {
      const filePath = path.join(this.uploadDir, path.basename(key));

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${key}`);
      }

      logger.info({ key }, 'Creating stream from S3 emulator');
      return fs.createReadStream(filePath);
    } catch (error: any) {
      logger.error({ key, error: error.message }, 'Error creating stream from S3 emulator');
      throw error;
    }
  }

  /**
   * Get file metadata from S3 emulator
   */
  async headObject(key: string): Promise<S3Object> {
    try {
      const filePath = path.join(this.uploadDir, path.basename(key));

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${key}`);
      }

      const stats = fs.statSync(filePath);
      const contentType = this.getContentType(filePath);

      return {
        key,
        size: stats.size,
        contentType,
        createdAt: stats.birthtime ? stats.birthtime.toISOString() : new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error({ key, error: error.message }, 'Error getting file metadata from S3 emulator');
      throw error;
    }
  }

  /**
   * List objects in S3 emulator
   */
  async listObjects(prefix?: string): Promise<S3Object[]> {
    try {
      const files = fs.readdirSync(this.uploadDir);
      const objects: S3Object[] = [];

      for (const file of files) {
        if (prefix && !file.startsWith(prefix)) continue;

        const filePath = path.join(this.uploadDir, file);
        const stats = fs.statSync(filePath);
        const contentType = this.getContentType(filePath);

        objects.push({
          key: file,
          size: stats.size,
          contentType,
          createdAt: stats.birthtime ? stats.birthtime.toISOString() : new Date().toISOString(),
        });
      }

      return objects;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error listing objects from S3 emulator');
      throw error;
    }
  }

  /**
   * Delete object from S3 emulator
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, path.basename(key));

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${key}`);
      }

      fs.unlinkSync(filePath);
      logger.info({ key }, 'File deleted from S3 emulator');
    } catch (error: any) {
      logger.error({ key, error: error.message }, 'Error deleting file from S3 emulator');
      throw error;
    }
  }

  /**
   * Detect content type from file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }
}

// Default singleton instance
export const s3 = new S3Emulator();
