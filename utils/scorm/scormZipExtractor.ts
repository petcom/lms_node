import AdmZip from 'adm-zip';
import path from 'path';
import { IStorageProvider } from '../../types/scorm-types';
import { StorageFactory } from './storage/StorageFactory';

/**
 * SCORM ZIP Extractor
 * Extracts SCORM packages to storage (local or S3)
 */
export class ScormZipExtractor {
  private storageProvider: IStorageProvider;

  constructor(storageProvider?: IStorageProvider) {
    this.storageProvider = storageProvider || StorageFactory.getProvider();
  }

  /**
   * Extract SCORM package to storage
   * @param zipBuffer ZIP file buffer
   * @param packageId Unique package identifier
   * @returns Path to extracted package
   */
  async extractPackage(zipBuffer: Buffer, packageId: string): Promise<string> {
    try {
      // Parse ZIP file
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();

      // Extract all files to storage
      const extractPromises = entries.map(async (entry) => {
        // Skip directories
        if (entry.isDirectory) {
          return;
        }

        // Sanitize entry name
        const sanitizedName = this.sanitizeEntryName(entry.entryName);

        // Construct storage path
        const storagePath = path.posix.join(packageId, sanitizedName);

        // Extract file data
        const fileData = entry.getData();

        // Save to storage
        await this.storageProvider.saveFile(fileData, storagePath);
      });

      await Promise.all(extractPromises);

      // Verify imsmanifest.xml was extracted
      const manifestPath = path.posix.join(packageId, 'imsmanifest.xml');
      const manifestExists = await this.storageProvider.fileExists(manifestPath);

      if (!manifestExists) {
        throw new Error('imsmanifest.xml not found after extraction');
      }

      return packageId;
    } catch (error: any) {
      // Clean up on failure
      try {
        await this.deletePackage(packageId);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      throw new Error(`Failed to extract SCORM package: ${error.message}`);
    }
  }

  /**
   * Extract SCORM package to storage (alias for extractPackage)
   * @param zipBuffer ZIP file buffer
   * @param packageId Unique package identifier
   * @returns Path to extracted package
   */
  async extract(zipBuffer: Buffer, packageId: string): Promise<string> {
    return await this.extractPackage(zipBuffer, packageId);
  }

  /**
   * Delete an extracted package from storage
   * @param packageId Package identifier
   */
  async deletePackage(packageId: string): Promise<void> {
    try {
      // Delete the entire package directory
      await this.storageProvider.deleteFile(`${packageId}/`);
    } catch (error: any) {
      throw new Error(`Failed to delete package: ${error.message}`);
    }
  }

  /**
   * Get manifest content from extracted package
   * @param packageId Package identifier
   * @returns Manifest XML content
   */
  async getManifestContent(packageId: string): Promise<string> {
    try {
      const manifestPath = path.posix.join(packageId, 'imsmanifest.xml');
      const manifestBuffer = await this.storageProvider.readFile(manifestPath);
      return manifestBuffer.toString('utf-8');
    } catch (error: any) {
      throw new Error(`Failed to read manifest: ${error.message}`);
    }
  }

  /**
   * Get a file from the extracted package
   * @param packageId Package identifier
   * @param filePath Relative file path within package
   * @returns File buffer
   */
  async getFile(packageId: string, filePath: string): Promise<Buffer> {
    try {
      const sanitizedPath = this.sanitizeEntryName(filePath);
      const fullPath = path.posix.join(packageId, sanitizedPath);
      return await this.storageProvider.readFile(fullPath);
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Get file URL for serving content
   * @param packageId Package identifier
   * @param filePath Relative file path within package
   * @returns URL to access the file
   */
  getFileUrl(packageId: string, filePath: string): string {
    const sanitizedPath = this.sanitizeEntryName(filePath);
    const fullPath = path.posix.join(packageId, sanitizedPath);
    return this.storageProvider.getFileUrl(fullPath);
  }

  /**
   * Check if a file exists in the package
   * @param packageId Package identifier
   * @param filePath Relative file path within package
   * @returns True if file exists
   */
  async fileExists(packageId: string, filePath: string): Promise<boolean> {
    try {
      const sanitizedPath = this.sanitizeEntryName(filePath);
      const fullPath = path.posix.join(packageId, sanitizedPath);
      return await this.storageProvider.fileExists(fullPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * List all files in the package
   * @param packageId Package identifier
   * @returns Array of file paths
   */
  async listFiles(packageId: string): Promise<string[]> {
    try {
      const files = await this.storageProvider.listFiles(`${packageId}/`);

      // Remove package ID prefix from paths
      return files.map((file) => {
        return file.startsWith(`${packageId}/`) ? file.substring(`${packageId}/`.length) : file;
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Sanitize entry name to prevent path traversal attacks
   * @param entryName Entry name from ZIP file
   * @returns Sanitized entry name
   */
  private sanitizeEntryName(entryName: string): string {
    // Remove leading slashes
    let sanitized = entryName.replace(/^\/+/, '');

    // Replace backslashes with forward slashes
    sanitized = sanitized.replace(/\\/g, '/');

    // Remove ../ patterns
    sanitized = sanitized.replace(/\.\.\//g, '');

    // Remove ./ patterns at the start
    sanitized = sanitized.replace(/^\.\//g, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Ensure the path is relative
    if (path.isAbsolute(sanitized)) {
      sanitized = sanitized.substring(1);
    }

    return sanitized;
  }

  /**
   * Set custom storage provider (useful for testing)
   */
  setStorageProvider(provider: IStorageProvider): void {
    this.storageProvider = provider;
  }
}
