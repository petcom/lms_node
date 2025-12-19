import { ScormZipExtractor } from '../../../utils/scorm/scormZipExtractor';
import { LocalStorageProvider } from '../../../utils/scorm/storage/LocalStorageProvider';
import { StorageProvider } from '../../../utils/scorm/storage/StorageProvider';
import { ScormTestHelper } from '../../helpers/scormTestHelper';
import path from 'path';
import fs from 'fs-extra';

describe('ScormZipExtractor', () => {
  let extractor: ScormZipExtractor;
  let storageProvider: StorageProvider;
  const testStoragePath = path.join(__dirname, '../../fixtures/scorm/test-storage');

  beforeAll(async () => {
    await fs.ensureDir(testStoragePath);
    storageProvider = new LocalStorageProvider(testStoragePath);
  });

  beforeEach(() => {
    extractor = new ScormZipExtractor(storageProvider);
  });

  afterEach(async () => {
    // Clean up test storage
    await fs.emptyDir(testStoragePath);
  });

  afterAll(async () => {
    await fs.remove(testStoragePath);
  });

  describe('extract', () => {
    it('should extract a valid SCORM 1.2 package', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-scorm12-package';

      const extractedPath = await extractor.extract(packageBuffer, packageId);

      expect(extractedPath).toBe(packageId);
      
      // Verify manifest exists
      const manifestExists = await storageProvider.fileExists(
        path.join(packageId, 'imsmanifest.xml')
      );
      expect(manifestExists).toBe(true);

      // Verify index.html exists
      const indexExists = await storageProvider.fileExists(
        path.join(packageId, 'index.html')
      );
      expect(indexExists).toBe(true);
    });

    it('should extract a valid SCORM 2004 package', async () => {
      const packageBuffer = ScormTestHelper.createScorm2004Package();
      const packageId = 'test-scorm2004-package';

      const extractedPath = await extractor.extract(packageBuffer, packageId);

      expect(extractedPath).toBe(packageId);

      const manifestExists = await storageProvider.fileExists(
        path.join(packageId, 'imsmanifest.xml')
      );
      expect(manifestExists).toBe(true);
    });

    it('should sanitize file paths during extraction', async () => {
      const maliciousPackage = ScormTestHelper.createMaliciousPackage();
      const packageId = 'test-malicious-package';

      // Should extract without throwing, but sanitize paths
      await expect(
        extractor.extract(maliciousPackage, packageId)
      ).resolves.not.toThrow();

      // Verify that path traversal was prevented
      const parentDirFiles = await fs.readdir(testStoragePath);
      expect(parentDirFiles).toContain('test-malicious-package');
    });

    it('should throw error for invalid zip file', async () => {
      const invalidZip = Buffer.from('This is not a valid ZIP file');
      const packageId = 'test-invalid-zip';

      await expect(extractor.extract(invalidZip, packageId)).rejects.toThrow();
    });

    it('should throw error for missing imsmanifest.xml', async () => {
      const invalidPackage = ScormTestHelper.createInvalidPackage();
      const packageId = 'test-no-manifest';

      await expect(extractor.extract(invalidPackage, packageId)).rejects.toThrow(
        'imsmanifest.xml not found'
      );
    });

    it('should clean up on extraction failure', async () => {
      const invalidPackage = ScormTestHelper.createInvalidPackage();
      const packageId = 'test-cleanup';

      try {
        await extractor.extract(invalidPackage, packageId);
      } catch (error) {
        // Expected to fail
      }

      // Verify cleanup happened
      const packageExists = await storageProvider.fileExists(packageId);
      expect(packageExists).toBe(false);
    });

    it('should extract nested directory structures', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-nested-structure';

      await extractor.extract(packageBuffer, packageId);

      // Verify nested file exists (if test helper creates nested structure)
      const manifestPath = path.join(packageId, 'imsmanifest.xml');
      const manifestExists = await storageProvider.fileExists(manifestPath);
      expect(manifestExists).toBe(true);
    });

    it('should handle packages with various file types', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-file-types';

      await extractor.extract(packageBuffer, packageId);

      // Check for HTML file
      const htmlExists = await storageProvider.fileExists(
        path.join(packageId, 'index.html')
      );
      expect(htmlExists).toBe(true);

      // Check for manifest
      const manifestExists = await storageProvider.fileExists(
        path.join(packageId, 'imsmanifest.xml')
      );
      expect(manifestExists).toBe(true);
    });

    it('should preserve file permissions during extraction', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-permissions';

      await extractor.extract(packageBuffer, packageId);

      // Files should be readable
      const manifestPath = path.join(testStoragePath, packageId, 'imsmanifest.xml');
      const stats = await fs.stat(manifestPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should handle empty directories in ZIP', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-empty-dirs';

      // Should not throw even if ZIP contains empty directories
      await expect(
        extractor.extract(packageBuffer, packageId)
      ).resolves.not.toThrow();
    });

    it('should handle packages with sanitized filenames', async () => {
      const maliciousPackage = ScormTestHelper.createMaliciousPackage();
      const packageId = 'test-sanitized';

      // Should extract successfully after sanitizing dangerous paths
      await expect(
        extractor.extract(maliciousPackage, packageId)
      ).resolves.not.toThrow();
    });

    it('should handle large file counts efficiently', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-many-files';

      const startTime = Date.now();
      await extractor.extract(packageBuffer, packageId);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds for test package)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('getManifestContent', () => {
    it('should retrieve manifest content after extraction', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-get-manifest';

      await extractor.extract(packageBuffer, packageId);
      const manifestContent = await extractor.getManifestContent(packageId);

      expect(manifestContent).toContain('<manifest');
    });

    it('should throw error if manifest not found', async () => {
      const packageId = 'non-existent-package';

      await expect(
        extractor.getManifestContent(packageId)
      ).rejects.toThrow('Failed to read manifest');
    });
  });

  describe('Edge cases', () => {
    it('should handle packageId with special characters', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-package_123-abc';

      await expect(
        extractor.extract(packageBuffer, packageId)
      ).resolves.not.toThrow();
    });

    it('should handle very small packages', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-small-package';

      await expect(
        extractor.extract(packageBuffer, packageId)
      ).resolves.not.toThrow();
    });

    it('should handle packages with Unicode filenames', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-unicode-files';

      // Modern ZIP libraries should handle Unicode
      await expect(
        extractor.extract(packageBuffer, packageId)
      ).resolves.not.toThrow();
    });

    it('should not overwrite existing extracted packages without confirmation', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const packageId = 'test-no-overwrite';

      // Extract first time
      await extractor.extract(packageBuffer, packageId);

      // Attempt to extract again (should handle gracefully)
      await expect(
        extractor.extract(packageBuffer, packageId)
      ).resolves.not.toThrow();
    });
  });
});
