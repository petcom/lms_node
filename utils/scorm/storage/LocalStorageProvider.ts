import fs from 'fs-extra';
import path from 'path';
import { StorageProvider } from './StorageProvider';

/**
 * Local filesystem storage provider
 * Stores SCORM packages on the local filesystem
 */
export class LocalStorageProvider extends StorageProvider {
  private basePath: string;

  constructor(basePath: string = './scorm-content/packages') {
    super();
    this.basePath = path.resolve(basePath);
    // Ensure base directory exists
    fs.ensureDirSync(this.basePath);
  }

  /**
   * Save a file to local storage
   */
  async saveFile(buffer: Buffer, filePath: string): Promise<string> {
    const sanitizedPath = this.sanitizePath(filePath);
    const fullPath = path.join(this.basePath, sanitizedPath);

    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(fullPath));

    // Write file
    await fs.writeFile(fullPath, buffer);

    return sanitizedPath;
  }

  /**
   * Save a file to local storage (alias for saveFile)
   */
  async save(filePath: string, buffer: Buffer): Promise<string> {
    return await this.saveFile(buffer, filePath);
  }

  /**
   * Read a file from local storage
   */
  async readFile(filePath: string): Promise<Buffer> {
    const sanitizedPath = this.sanitizePath(filePath);
    const fullPath = path.join(this.basePath, sanitizedPath);

    if (!(await this.fileExists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    return await fs.readFile(fullPath);
  }

  /**
   * Read a file from local storage (alias for readFile)
   */
  async read(filePath: string): Promise<Buffer> {
    return await this.readFile(filePath);
  }

  /**
   * Delete a file or directory from local storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const sanitizedPath = this.sanitizePath(filePath);
    const fullPath = path.join(this.basePath, sanitizedPath);

    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
    }
  }

  /**
   * Delete a file or directory from local storage (alias for deleteFile)
   */
  async delete(filePath: string): Promise<void> {
    return await this.deleteFile(filePath);
  }

  /**
   * Check if a file exists in local storage
   */
  async fileExists(filePath: string): Promise<boolean> {
    const sanitizedPath = this.sanitizePath(filePath);
    const fullPath = path.join(this.basePath, sanitizedPath);
    return await fs.pathExists(fullPath);
  }

  /**
   * Get file URL for local storage
   * Returns a path that can be used with Express static middleware
   */
  getFileUrl(filePath: string): string {
    const sanitizedPath = this.sanitizePath(filePath);
    return `/scorm/content/${sanitizedPath}`;
  }

  /**
   * Get file URL for local storage (alias for getFileUrl)
   */
  getUrl(filePath: string): string {
    const sanitizedPath = this.sanitizePath(filePath);
    // Normalize path separators and remove ./ patterns
    const normalizedPath = sanitizedPath.replace(/\/+/g, '/').replace(/\/\.\/|^\.\//g, '/');
    return `/scorm-content/${normalizedPath}`;
  }

  /**
   * List files in a directory
   */
  async listFiles(dirPath: string): Promise<string[]> {
    const sanitizedPath = this.sanitizePath(dirPath);
    const fullPath = path.join(this.basePath, sanitizedPath);

    if (!(await fs.pathExists(fullPath))) {
      return [];
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return [];
    }

    const files = await fs.readdir(fullPath);
    return files.map((file: string) => path.join(sanitizedPath, file));
  }

  /**
   * Get the full local path for a file
   */
  getFullPath(filePath: string): string {
    const sanitizedPath = this.sanitizePath(filePath);
    return path.join(this.basePath, sanitizedPath);
  }
}
