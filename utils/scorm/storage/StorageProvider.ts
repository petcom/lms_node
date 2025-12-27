import { IStorageProvider } from '../../../types/scorm';

/**
 * Abstract base class for storage providers
 * Defines the interface that all storage implementations must follow
 */
export abstract class StorageProvider implements IStorageProvider {
  /**
   * Save a file to storage
   */
  abstract saveFile(buffer: Buffer, path: string): Promise<string>;

  /**
   * Read a file from storage
   */
  abstract readFile(path: string): Promise<Buffer>;

  /**
   * Delete a file or directory from storage
   */
  abstract deleteFile(path: string): Promise<void>;

  /**
   * Check if a file exists
   */
  abstract fileExists(path: string): Promise<boolean>;

  /**
   * Get file URL (for serving content)
   */
  abstract getFileUrl(path: string): string;

  /**
   * List files in a directory
   */
  abstract listFiles(path: string): Promise<string[]>;

  /**
   * Sanitize file path to prevent directory traversal attacks
   */
  protected sanitizePath(filePath: string): string {
    // Remove null bytes
    let sanitized = filePath.replace(/\x00/g, '');

    // Remove any ../ or ..\\ patterns
    sanitized = sanitized.replace(/\.\.[/\\]/g, '');

    return sanitized;
  }

  /**
   * Ensure path uses forward slashes
   */
  protected normalizePath(path: string): string {
    return path.replace(/\\/g, '/');
  }
}
