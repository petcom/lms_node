import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { StorageProvider } from './StorageProvider';

/**
 * S3-compatible storage provider
 * Supports AWS S3, Digital Ocean Spaces, MinIO, and other S3-compatible services
 */
export class S3StorageProvider extends StorageProvider {
  private s3Client: S3Client;
  private bucket: string;
  private baseUrl: string;

  constructor(config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string;
  }) {
    super();

    this.bucket = config.bucket;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint && {
        endpoint: config.endpoint,
        forcePathStyle: true, // Required for Digital Ocean Spaces and MinIO
      }),
    });

    // Determine base URL for serving content
    if (config.endpoint) {
      // Custom endpoint (Digital Ocean Spaces, MinIO, etc.)
      this.baseUrl = `${config.endpoint}/${config.bucket}`;
    } else {
      // AWS S3
      this.baseUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
    }
  }

  /**
   * Save a file to S3 storage
   */
  async saveFile(buffer: Buffer, filePath: string): Promise<string> {
    const sanitizedPath = this.normalizePath(this.sanitizePath(filePath));

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucket,
        Key: sanitizedPath,
        Body: buffer,
        ContentType: this.getContentType(filePath),
      },
    });

    await upload.done();

    return sanitizedPath;
  }

  /**
   * Read a file from S3 storage
   */
  async readFile(filePath: string): Promise<Buffer> {
    const sanitizedPath = this.normalizePath(this.sanitizePath(filePath));

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: sanitizedPath,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Delete a file or directory from S3 storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const sanitizedPath = this.normalizePath(this.sanitizePath(filePath));

    // Check if it's a directory (ends with /)
    if (sanitizedPath.endsWith('/')) {
      // Delete all files in the directory
      await this.deleteDirectory(sanitizedPath);
    } else {
      // Delete single file
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: sanitizedPath,
      });

      await this.s3Client.send(command);
    }
  }

  /**
   * Delete all files in a directory
   */
  private async deleteDirectory(dirPath: string): Promise<void> {
    const files = await this.listFiles(dirPath);

    // Delete all files in the directory
    const deletePromises = files.map(async (file) => {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: file,
      });
      return this.s3Client.send(command);
    });

    await Promise.all(deletePromises);
  }

  /**
   * Check if a file exists in S3 storage
   */
  async fileExists(filePath: string): Promise<boolean> {
    const sanitizedPath = this.normalizePath(this.sanitizePath(filePath));

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: sanitizedPath,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file URL for S3 storage
   */
  getFileUrl(filePath: string): string {
    const sanitizedPath = this.normalizePath(this.sanitizePath(filePath));
    return `${this.baseUrl}/${sanitizedPath}`;
  }

  /**
   * List files in a directory
   */
  async listFiles(dirPath: string): Promise<string[]> {
    const sanitizedPath = this.normalizePath(this.sanitizePath(dirPath));
    const prefix = sanitizedPath.endsWith('/') ? sanitizedPath : `${sanitizedPath}/`;

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    try {
      const response = await this.s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        return [];
      }

      return response.Contents.map((item) => item.Key || '').filter((key) => key !== '');
    } catch (error) {
      return [];
    }
  }

  /**
   * Determine content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();

    const contentTypes: Record<string, string> = {
      html: 'text/html',
      htm: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      xml: 'application/xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      zip: 'application/zip',
      mp4: 'video/mp4',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      eot: 'application/vnd.ms-fontobject',
    };

    return contentTypes[ext || ''] || 'application/octet-stream';
  }
}
