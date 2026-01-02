import AdmZip from 'adm-zip';
import { IValidationResult, ScormVersion } from '../../types/scorm-types';

/**
 * SCORM Package Validator
 * Validates SCORM packages for security and compliance
 */
export class PackageValidator {
  private readonly maxFileSize: number;
  private readonly allowedExtensions: Set<string>;
  private readonly dangerousPatterns: RegExp[];

  constructor() {
    // Default max file size: 500MB
    this.maxFileSize = parseInt(process.env.SCORM_MAX_FILE_SIZE || '524288000', 10);

    // Allowed file extensions in SCORM packages
    this.allowedExtensions = new Set([
      '.html',
      '.htm',
      '.xml',
      '.js',
      '.css',
      '.json',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.svg',
      '.mp4',
      '.mp3',
      '.wav',
      '.pdf',
      '.woff',
      '.woff2',
      '.ttf',
      '.eot',
      '.swf',
      '.txt',
      '.webm',
      '.ogg',
    ]);

    // Dangerous path patterns
    this.dangerousPatterns = [
      /\.\.\//g, // Parent directory traversal
      /\.\.\\/g, // Windows parent directory traversal
      /^\//, // Absolute paths
      /^[A-Za-z]:\\/g, // Windows absolute paths
      /\0/g, // Null bytes
    ];
  }

  /**
   * Validate a SCORM package
   */
  async validatePackage(zipBuffer: Buffer): Promise<IValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let version: ScormVersion | undefined;

    try {
      // Check file size
      if (zipBuffer.length > this.maxFileSize) {
        errors.push(
          `Package size (${this.formatBytes(zipBuffer.length)}) exceeds maximum allowed size (${this.formatBytes(this.maxFileSize)})`
        );
        return {
          isValid: false,
          errors,
          warnings,
          packageSize: zipBuffer.length,
        };
      }

      // Parse ZIP file
      let zip: AdmZip;
      try {
        zip = new AdmZip(zipBuffer);
      } catch (error: any) {
        errors.push('Invalid ZIP file format');
        return {
          isValid: false,
          errors,
          warnings,
          packageSize: zipBuffer.length,
        };
      }

      const entries = zip.getEntries();

      // Check for imsmanifest.xml
      const manifestEntry = entries.find((e) => e.entryName.toLowerCase() === 'imsmanifest.xml');

      if (!manifestEntry) {
        errors.push('Missing imsmanifest.xml in package root');
        return {
          isValid: false,
          errors,
          warnings,
          packageSize: zipBuffer.length,
        };
      }

      // Validate manifest XML
      const manifestXml = manifestEntry.getData().toString('utf-8');
      const manifestValidation = this.validateManifestXml(manifestXml);

      if (!manifestValidation.isValid) {
        errors.push(...manifestValidation.errors);
      }

      version = manifestValidation.version;

      // Check for dangerous file paths
      for (const entry of entries) {
        const pathValidation = this.validateFilePath(entry.entryName);

        if (!pathValidation.isValid) {
          warnings.push(`Dangerous file path will be sanitized: ${entry.entryName}`);
        }

        // Warn about unusual extensions
        const ext = this.getFileExtension(entry.entryName);
        if (ext && !this.allowedExtensions.has(ext)) {
          warnings.push(`Unusual file extension detected: ${entry.entryName}`);
        }
      }

      // Check for suspiciously large files
      for (const entry of entries) {
        if (entry.header.size > 100 * 1024 * 1024) {
          // 100MB
          warnings.push(
            `Large file detected: ${entry.entryName} (${this.formatBytes(entry.header.size)})`
          );
        }
      }

      // Check total uncompressed size
      const totalSize = entries.reduce((sum, entry) => sum + entry.header.size, 0);

      if (totalSize > 2 * 1024 * 1024 * 1024) {
        // 2GB uncompressed
        warnings.push(
          `Large uncompressed size: ${this.formatBytes(totalSize)}. This may cause performance issues.`
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        version,
        packageSize: zipBuffer.length,
      };
    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings,
        packageSize: zipBuffer.length,
      };
    }
  }

  /**
   * Validate manifest XML structure
   */
  private validateManifestXml(xml: string): {
    isValid: boolean;
    errors: string[];
    version?: ScormVersion;
  } {
    const errors: string[] = [];
    let version: ScormVersion | undefined;

    try {
      // Check for manifest root element
      if (!xml.includes('<manifest')) {
        errors.push('Invalid manifest: missing <manifest> root element');
        return { isValid: false, errors };
      }

      // Detect SCORM version
      if (
        xml.includes('adlcp:scormtype') ||
        xml.includes('adlcp:scormType') ||
        xml.includes('scormType="sco"')
      ) {
        if (xml.includes('2004') || xml.includes('1.3')) {
          version = 'scorm_2004';
        } else {
          version = 'scorm_1.2';
        }
      } else if (xml.includes('schemaversion') || xml.includes('schemaVersion')) {
        // Check schema version
        if (xml.includes('1.2')) {
          version = 'scorm_1.2';
        } else if (xml.includes('2004') || xml.includes('CAM 1.3')) {
          version = 'scorm_2004';
        }
      }

      if (!version) {
        // Try to detect by namespace
        if (xml.includes('IMS_1.2') || xml.includes('ims_cp_rootv1p1')) {
          version = 'scorm_1.2';
        } else if (
          xml.includes('IMS_2004') ||
          xml.includes('imscp_v1p1') ||
          xml.includes('SCORM_2004')
        ) {
          version = 'scorm_2004';
        }
      }

      // Check for required elements
      if (!xml.includes('<organizations')) {
        errors.push('Invalid manifest: missing <organizations> element');
      }

      if (!xml.includes('<resources')) {
        errors.push('Invalid manifest: missing <resources> element');
      }

      // Check for XXE (XML External Entity) attacks
      if (xml.includes('<!ENTITY') || xml.includes('<!DOCTYPE')) {
        errors.push('Security error: External entities not allowed in manifest');
      }

      return {
        isValid: errors.length === 0,
        errors,
        version,
      };
    } catch (error: any) {
      errors.push(`Manifest parsing error: ${error.message}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Validate file path for security issues
   */
  private validateFilePath(filePath: string): { isValid: boolean } {
    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(filePath)) {
        return { isValid: false };
      }
    }

    // Check for hidden files (except .well-known)
    if (filePath.startsWith('.') && !filePath.startsWith('.well-known/')) {
      return { isValid: false };
    }

    return { isValid: true };
  }

  /**
   * Get file extension
   */
  private getFileExtension(filePath: string): string | null {
    const match = filePath.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : null;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
