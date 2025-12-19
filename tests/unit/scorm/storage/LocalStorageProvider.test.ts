import { LocalStorageProvider } from '../../../../utils/scorm/storage/LocalStorageProvider';
import path from 'path';
import fs from 'fs-extra';

describe('LocalStorageProvider', () => {
  const testBasePath = path.join(__dirname, '../../../fixtures/scorm/local-storage-test');
  let provider: LocalStorageProvider;

  beforeAll(async () => {
    await fs.ensureDir(testBasePath);
  });

  beforeEach(() => {
    provider = new LocalStorageProvider(testBasePath);
  });

  afterEach(async () => {
    await fs.emptyDir(testBasePath);
  });

  afterAll(async () => {
    await fs.remove(testBasePath);
  });

  describe('save', () => {
    it('should save a file successfully', async () => {
      const testData = Buffer.from('Test content');
      const filePath = 'test-package/index.html';

      await provider.save(filePath, testData);

      const fullPath = path.join(testBasePath, filePath);
      const exists = await fs.pathExists(fullPath);
      expect(exists).toBe(true);

      const content = await fs.readFile(fullPath);
      expect(content.toString()).toBe('Test content');
    });

    it('should create nested directories automatically', async () => {
      const testData = Buffer.from('Nested content');
      const filePath = 'package/sub/dir/file.txt';

      await provider.save(filePath, testData);

      const fullPath = path.join(testBasePath, filePath);
      const exists = await fs.pathExists(fullPath);
      expect(exists).toBe(true);
    });

    it('should sanitize dangerous paths', async () => {
      const testData = Buffer.from('Test');
      const dangerousPath = '../../../etc/passwd';

      await provider.save(dangerousPath, testData);

      // Should be saved within basePath, not at dangerous location
      const expectedPath = path.join(testBasePath, 'etc/passwd');
      const exists = await fs.pathExists(expectedPath);
      expect(exists).toBe(true);

      // Verify it didn't escape basePath
      const parentDir = path.dirname(testBasePath);
      const dangerousFile = path.join(parentDir, 'etc/passwd');
      const dangerousExists = await fs.pathExists(dangerousFile);
      expect(dangerousExists).toBe(false);
    });

    it('should handle absolute paths safely', async () => {
      const testData = Buffer.from('Test');
      const absolutePath = '/etc/passwd';

      await provider.save(absolutePath, testData);

      // Should be saved relative to basePath
      const fullPath = path.join(testBasePath, 'etc/passwd');
      const exists = await fs.pathExists(fullPath);
      expect(exists).toBe(true);
    });

    it('should overwrite existing files', async () => {
      const filePath = 'test/file.txt';
      
      await provider.save(filePath, Buffer.from('First content'));
      await provider.save(filePath, Buffer.from('Second content'));

      const fullPath = path.join(testBasePath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      expect(content).toBe('Second content');
    });
  });

  describe('read', () => {
    it('should read an existing file', async () => {
      const filePath = 'test/read.txt';
      const content = 'Read me!';
      
      await provider.save(filePath, Buffer.from(content));
      const result = await provider.read(filePath);

      expect(result.toString()).toBe(content);
    });

    it('should throw error for non-existent file', async () => {
      const filePath = 'non-existent.txt';

      await expect(provider.read(filePath)).rejects.toThrow();
    });

    it('should read binary files correctly', async () => {
      const filePath = 'test/binary.bin';
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE]);

      await provider.save(filePath, binaryData);
      const result = await provider.read(filePath);

      expect(result).toEqual(binaryData);
    });
  });

  describe('delete', () => {
    it('should delete an existing file', async () => {
      const filePath = 'test/delete.txt';
      
      await provider.save(filePath, Buffer.from('Delete me'));
      await provider.delete(filePath);

      const fullPath = path.join(testBasePath, filePath);
      const exists = await fs.pathExists(fullPath);
      expect(exists).toBe(false);
    });

    it('should delete a directory recursively', async () => {
      const dirPath = 'test-dir';
      
      await provider.save(`${dirPath}/file1.txt`, Buffer.from('File 1'));
      await provider.save(`${dirPath}/subdir/file2.txt`, Buffer.from('File 2'));

      await provider.delete(dirPath);

      const fullPath = path.join(testBasePath, dirPath);
      const exists = await fs.pathExists(fullPath);
      expect(exists).toBe(false);
    });

    it('should not throw error when deleting non-existent path', async () => {
      const filePath = 'non-existent.txt';

      await expect(provider.delete(filePath)).resolves.not.toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = 'test/exists.txt';
      
      await provider.save(filePath, Buffer.from('I exist'));
      const exists = await provider.fileExists(filePath);

      expect(exists).toBe(true);
    });

    it('should return true for existing directory', async () => {
      const dirPath = 'test-directory';
      
      await provider.save(`${dirPath}/file.txt`, Buffer.from('In directory'));
      const exists = await provider.fileExists(dirPath);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const filePath = 'does-not-exist.txt';
      const exists = await provider.fileExists(filePath);

      expect(exists).toBe(false);
    });
  });

  describe('getUrl', () => {
    it('should generate correct URL for file', () => {
      const filePath = 'package123/index.html';
      const url = provider.getUrl(filePath);

      expect(url).toBe('/scorm-content/package123/index.html');
    });

    it('should handle paths with special characters', () => {
      const filePath = 'package/file with spaces.html';
      const url = provider.getUrl(filePath);

      expect(url).toContain('package/file with spaces.html');
    });

    it('should normalize paths in URL', () => {
      const filePath = 'package//double-slash///file.html';
      const url = provider.getUrl(filePath);

      // URL should not have double slashes
      expect(url).toBe('/scorm-content/package/double-slash/file.html');
    });
  });

  describe('Path sanitization', () => {
    it('should prevent path traversal with ../', async () => {
      const testData = Buffer.from('Test');
      const paths = [
        '../outside.txt',
        'dir/../../outside.txt',
        './pkg/../../../outside.txt',
      ];

      for (const dangerousPath of paths) {
        await provider.save(dangerousPath, testData);
        
        // Verify file is saved within basePath
        const outsideBasePath = path.join(path.dirname(testBasePath), 'outside.txt');
        const escaped = await fs.pathExists(outsideBasePath);
        
        expect(escaped).toBe(false);
      }
    });

    it('should sanitize null bytes in paths', async () => {
      const pathWithNull = 'file\0.txt';

      // Should sanitize null bytes
      await provider.save(pathWithNull, Buffer.from('Test'));
      
      // Verify file was saved with sanitized name
      const exists = await provider.fileExists('file.txt');
      expect(exists).toBe(true);
    });

    it('should normalize paths correctly', () => {
      const paths = [
        ['package/file.txt', 'package/file.txt'],
        ['package//file.txt', 'package/file.txt'],
      ];

      paths.forEach(([input, expected]) => {
        const url = provider.getUrl(input);
        expect(url).toContain(expected);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty filenames', async () => {
      const emptyPath = '';

      await expect(
        provider.save(emptyPath, Buffer.from('Test'))
      ).rejects.toThrow();
    });

    it('should handle very long paths', async () => {
      const longDir = 'a'.repeat(100);
      const longFile = 'b'.repeat(100) + '.txt';
      const longPath = `${longDir}/${longFile}`;

      await expect(
        provider.save(longPath, Buffer.from('Long path test'))
      ).resolves.not.toThrow();
    });

    it('should handle Unicode in paths', async () => {
      const unicodePath = 'package/文件.txt';
      const content = Buffer.from('Unicode content');

      await provider.save(unicodePath, content);
      const result = await provider.read(unicodePath);

      expect(result.toString()).toBe('Unicode content');
    });

    it('should handle concurrent saves to different files', async () => {
      const saves = Array.from({ length: 10 }, (_, i) =>
        provider.save(`test/file${i}.txt`, Buffer.from(`Content ${i}`))
      );

      await expect(Promise.all(saves)).resolves.not.toThrow();

      // Verify all files were saved
      for (let i = 0; i < 10; i++) {
        const exists = await provider.fileExists(`test/file${i}.txt`);
        expect(exists).toBe(true);
      }
    });

    it('should handle large files', async () => {
      const largeData = Buffer.alloc(10 * 1024 * 1024, 'x'); // 10MB
      const filePath = 'test/large-file.bin';

      await provider.save(filePath, largeData);
      const result = await provider.read(filePath);

      expect(result.length).toBe(largeData.length);
    });
  });
});
