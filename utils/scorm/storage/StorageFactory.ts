import { IStorageProvider } from '../../../types/scorm';
import { LocalStorageProvider } from './LocalStorageProvider';
import { S3StorageProvider } from './S3StorageProvider';

/**
 * Storage Factory
 * Creates storage provider instances based on configuration
 */
export class StorageFactory {
  private static instance: StorageFactory | null = null;
  private provider: IStorageProvider | null = null;

  /**
   * Get singleton factory instance
   */
  static getInstance(): StorageFactory {
    const providerType = (process.env.SCORM_STORAGE_PROVIDER || 'local').toLowerCase().trim();
    
    if (providerType && providerType !== 'local' && providerType !== 's3') {
      throw new Error(`Invalid storage provider: ${process.env.SCORM_STORAGE_PROVIDER}`);
    }

    if (!this.instance) {
      this.instance = new StorageFactory();
    }
    return this.instance;
  }

  /**
   * Get storage provider instance
   */
  getProvider(): IStorageProvider {
    if (!this.provider) {
      this.provider = StorageFactory.createProvider();
    }
    return this.provider;
  }

  /**
   * Get storage provider instance (static method for backwards compatibility)
   */
  static getProvider(): IStorageProvider {
    return StorageFactory.getInstance().getProvider();
  }

  /**
   * Create storage provider based on environment configuration
   */
  private static createProvider(): IStorageProvider {
    const provider = (process.env.SCORM_STORAGE_PROVIDER || 'local').toLowerCase().trim();

    if (provider === 's3') {
      return this.createS3Provider();
    }

    return this.createLocalProvider();
  }

  /**
   * Create local storage provider
   */
  private static createLocalProvider(): LocalStorageProvider {
    const basePath = process.env.SCORM_STORAGE_PATH || './scorm-content/packages';
    return new LocalStorageProvider(basePath);
  }

  /**
   * Create S3 storage provider
   */
  private static createS3Provider(): S3StorageProvider {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.AWS_S3_BUCKET;
    const endpoint = process.env.AWS_S3_ENDPOINT;

    if (!accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        'S3 storage provider requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables'
      );
    }

    return new S3StorageProvider({
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
      endpoint,
    });
  }

  /**
   * Reset provider instance (useful for testing)
   */
  static resetProvider(): void {
    this.instance = null;
  }
}
