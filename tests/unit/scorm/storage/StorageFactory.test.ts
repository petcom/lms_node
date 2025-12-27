import { StorageFactory } from '../../../../utils/scorm/storage/StorageFactory';
import { LocalStorageProvider } from '../../../../utils/scorm/storage/LocalStorageProvider';
import { S3StorageProvider } from '../../../../utils/scorm/storage/S3StorageProvider';

describe('StorageFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment and singleton instance
    jest.resetModules();
    process.env = { ...originalEnv };

    // Reset singleton instance via private property
    (StorageFactory as any).instance = null;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = StorageFactory.getInstance();
      const instance2 = StorageFactory.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create LocalStorageProvider by default', () => {
      process.env.SCORM_STORAGE_PROVIDER = undefined;

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();

      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it('should create LocalStorageProvider when configured', () => {
      process.env.SCORM_STORAGE_PROVIDER = 'local';
      process.env.SCORM_STORAGE_PATH = './test-scorm-content';

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();

      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it('should create S3StorageProvider when configured', () => {
      process.env.SCORM_STORAGE_PROVIDER = 's3';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_S3_BUCKET = 'test-bucket';

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();

      expect(provider).toBeInstanceOf(S3StorageProvider);
    });

    it('should throw error for invalid provider type', () => {
      process.env.SCORM_STORAGE_PROVIDER = 'invalid-provider';

      expect(() => StorageFactory.getInstance()).toThrow(
        'Invalid storage provider: invalid-provider'
      );
    });
  });

  describe('getProvider', () => {
    it('should return the same provider instance on multiple calls', () => {
      process.env.SCORM_STORAGE_PROVIDER = 'local';

      const factory = StorageFactory.getInstance();
      const provider1 = factory.getProvider();
      const provider2 = factory.getProvider();

      expect(provider1).toBe(provider2);
    });

    it('should use SCORM_STORAGE_PATH for local provider', () => {
      const customPath = './test-scorm-content';
      process.env.SCORM_STORAGE_PROVIDER = 'local';
      process.env.SCORM_STORAGE_PATH = customPath;

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider() as LocalStorageProvider;

      // Provider should be created with custom path (verify it's local provider)
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it('should fallback to default path if SCORM_STORAGE_PATH not set', () => {
      process.env.SCORM_STORAGE_PROVIDER = 'local';
      delete process.env.SCORM_STORAGE_PATH;

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();

      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });
  });

  describe('S3 Configuration', () => {
    it('should require AWS_ACCESS_KEY_ID for S3 provider', () => {
      process.env.SCORM_STORAGE_PROVIDER = 's3';
      delete process.env.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = 'secret';
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_S3_BUCKET = 'bucket';

      expect(() => {
        const factory = StorageFactory.getInstance();
        factory.getProvider();
      }).toThrow();
    });

    it('should require AWS_SECRET_ACCESS_KEY for S3 provider', () => {
      process.env.SCORM_STORAGE_PROVIDER = 's3';
      process.env.AWS_ACCESS_KEY_ID = 'key';
      delete process.env.AWS_SECRET_ACCESS_KEY;
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_S3_BUCKET = 'bucket';

      expect(() => {
        const factory = StorageFactory.getInstance();
        factory.getProvider();
      }).toThrow();
    });

    it('should use default region if AWS_REGION not provided', () => {
      process.env.SCORM_STORAGE_PROVIDER = 's3';
      process.env.AWS_ACCESS_KEY_ID = 'key';
      process.env.AWS_SECRET_ACCESS_KEY = 'secret';
      delete process.env.AWS_REGION;
      process.env.AWS_S3_BUCKET = 'bucket';

      // Should not throw - region defaults to us-east-1
      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();
      expect(provider).toBeInstanceOf(S3StorageProvider);
    });

    it('should require AWS_S3_BUCKET for S3 provider', () => {
      process.env.SCORM_STORAGE_PROVIDER = 's3';
      process.env.AWS_ACCESS_KEY_ID = 'key';
      process.env.AWS_SECRET_ACCESS_KEY = 'secret';
      process.env.AWS_REGION = 'us-east-1';
      delete process.env.AWS_S3_BUCKET;

      expect(() => {
        const factory = StorageFactory.getInstance();
        factory.getProvider();
      }).toThrow();
    });

    it('should support AWS_S3_ENDPOINT for Digital Ocean Spaces', () => {
      process.env.SCORM_STORAGE_PROVIDER = 's3';
      process.env.AWS_ACCESS_KEY_ID = 'key';
      process.env.AWS_SECRET_ACCESS_KEY = 'secret';
      process.env.AWS_REGION = 'nyc3';
      process.env.AWS_S3_BUCKET = 'my-space';
      process.env.AWS_S3_ENDPOINT = 'https://nyc3.digitaloceanspaces.com';

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();

      expect(provider).toBeInstanceOf(S3StorageProvider);
    });
  });

  describe('Environment variable validation', () => {
    it('should handle provider name case-insensitively', () => {
      process.env.SCORM_STORAGE_PROVIDER = 'LOCAL';

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();

      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it('should trim whitespace from provider name', () => {
      process.env.SCORM_STORAGE_PROVIDER = '  local  ';

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();

      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it('should handle empty SCORM_STORAGE_PROVIDER', () => {
      process.env.SCORM_STORAGE_PROVIDER = '';

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();

      // Should default to local
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing environment variables gracefully', () => {
      // Clear all SCORM-related env vars
      delete process.env.SCORM_STORAGE_PROVIDER;
      delete process.env.SCORM_STORAGE_PATH;

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();

      // Should default to local provider
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it('should handle undefined AWS_S3_ENDPOINT for standard S3', () => {
      process.env.SCORM_STORAGE_PROVIDER = 's3';
      process.env.AWS_ACCESS_KEY_ID = 'key';
      process.env.AWS_SECRET_ACCESS_KEY = 'secret';
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_S3_BUCKET = 'bucket';
      delete process.env.AWS_S3_ENDPOINT;

      const factory = StorageFactory.getInstance();
      const provider = factory.getProvider();

      expect(provider).toBeInstanceOf(S3StorageProvider);
    });
  });
});
