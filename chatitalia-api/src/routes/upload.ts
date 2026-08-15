import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger';

const router = express.Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const presignedUrls = new Map<string, { expiresAt: number; filename?: string }>();

router.post('/presigned', (req: Request, res: Response) => {
  try {
    const { filename = 'file' } = req.body;
    const token = uuidv4();
    const expiresIn = 3600000; // 1 hour in ms
    const expiresAt = Date.now() + expiresIn;

    // Store token with metadata
    presignedUrls.set(token, {
      expiresAt,
      filename
    });

    // Generate presigned URL
    const presignedUrl = `${req.protocol}://${req.get('host')}/upload/${token}`;

    logger.info(
      { token, filename, expiresIn: expiresIn / 1000 },
      'Presigned URL generated'
    );

    res.json({
      presignedUrl,
      expiresIn,
      token
    });
  } catch (err: any) {
    logger.error(err, 'Error generating presigned URL');
    res.status(500).json({ error: err?.message || String(err) });
  }
});

/**
 * PUT /upload/:token
 * Emulates presigned URL upload
 * Receives file stream and saves it locally with support for large files
 */
router.put('/:token', (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Validate token
    const presignedData = presignedUrls.get(token);
    if (!presignedData) {
      logger.warn({ token }, 'Invalid or expired token');
      return res.status(403).json({ error: 'Invalid or expired presigned URL' });
    }

    // Check expiration
    if (presignedData.expiresAt < Date.now()) {
      presignedUrls.delete(token);
      logger.warn({ token }, 'Token expired');
      return res.status(403).json({ error: 'Presigned URL expired' });
    }

    // Generate file path
    const timestamp = Date.now();
    const filename = presignedData.filename || `file-${timestamp}`;
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
    const filepath = path.join(UPLOAD_DIR, `${timestamp}-${safeName}`);

    // Create write stream for large file support
    const writeStream = fs.createWriteStream(filepath);
    let uploadedSize = 0;

    // Track upload progress
    req.on('data', (chunk) => {
      uploadedSize += chunk.length;
    });

    // Pipe request to file
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      presignedUrls.delete(token); // Invalidate token after use
      logger.info(
        { token, filepath, size: uploadedSize },
        'File uploaded successfully'
      );
      res.status(200).json({
        message: 'File uploaded successfully',
        filepath,
        size: uploadedSize,
        filename: safeName
      });
    });

    writeStream.on('error', (err) => {
      presignedUrls.delete(token);
      logger.error(err, 'Error writing file');
      res.status(500).json({ error: 'Error saving file' });
    });

    req.on('error', (err) => {
      logger.error(err, 'Error reading request stream');
      writeStream.destroy();
      res.status(500).json({ error: 'Error receiving file' });
    });
  } catch (err: any) {
    logger.error(err, 'Error handling upload');
    res.status(500).json({ error: err?.message || String(err) });
  }
});

export default router;
