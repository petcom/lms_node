import { PackageValidator } from '../../../utils/scorm/packageValidator';
import { ScormTestHelper } from '../../helpers/scormTestHelper';

describe('PackageValidator', () => {
  let validator: PackageValidator;

  beforeEach(() => {
    validator = new PackageValidator();
  });

  describe('validatePackage', () => {
    it('should validate a correct SCORM 1.2 package', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const result = await validator.validatePackage(packageBuffer);

      expect(result.isValid).toBe(true);
      expect(result.version).toBe('scorm_1.2');
      expect(result.errors).toHaveLength(0);
      expect(result.packageSize).toBeGreaterThan(0);
    });

    it('should validate a correct SCORM 2004 package', async () => {
      const packageBuffer = ScormTestHelper.createScorm2004Package();
      const result = await validator.validatePackage(packageBuffer);

      expect(result.isValid).toBe(true);
      expect(result.version).toBe('scorm_2004');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a package missing imsmanifest.xml', async () => {
      const packageBuffer = ScormTestHelper.createInvalidPackage();
      const result = await validator.validatePackage(packageBuffer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing imsmanifest.xml in package root');
    });

    it('should reject a package exceeding max file size', async () => {
      // Create a package larger than 500MB (default limit)
      const largeBuffer = Buffer.alloc(600 * 1024 * 1024); // 600MB
      const result = await validator.validatePackage(largeBuffer);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('exceeds maximum allowed size');
    });

    it('should validate packages with dangerous paths after sanitization', async () => {
      const maliciousBuffer = ScormTestHelper.createMaliciousPackage();
      const result = await validator.validatePackage(maliciousBuffer);

      // Package is now valid after sanitization
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid ZIP files', async () => {
      const invalidBuffer = Buffer.from('This is not a ZIP file', 'utf-8');
      const result = await validator.validatePackage(invalidBuffer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid ZIP file format');
    });

    it('should warn about large files in package', async () => {
      const packageWithLargeFile = ScormTestHelper.createLargePackage(150); // 150MB
      const result = await validator.validatePackage(packageWithLargeFile);

      expect(result.warnings.some((w) => w.includes('Large file detected'))).toBe(true);
    });

    it('should warn about unusual file extensions', async () => {
      const zip = require('adm-zip');
      const testZip = new zip();

      const manifest = `<?xml version="1.0"?>
<manifest identifier="test" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations/>
  <resources/>
</manifest>`;

      testZip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));
      testZip.addFile('unusual.xyz', Buffer.from('unusual file', 'utf-8'));

      const result = await validator.validatePackage(testZip.toBuffer());

      expect(result.warnings.some((w) => w.includes('Unusual file extension'))).toBe(true);
    });

    it('should detect XXE attacks in manifest', async () => {
      const zip = require('adm-zip');
      const testZip = new zip();

      const maliciousManifest = `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<manifest identifier="malicious" version="1.0">
  <data>&xxe;</data>
</manifest>`;

      testZip.addFile('imsmanifest.xml', Buffer.from(maliciousManifest, 'utf-8'));

      const result = await validator.validatePackage(testZip.toBuffer());

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('External entities not allowed'))).toBe(true);
    });

    it('should handle corrupted ZIP gracefully', async () => {
      const corruptedBuffer = Buffer.from('PK\x03\x04corrupted', 'utf-8');
      const result = await validator.validatePackage(corruptedBuffer);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate package size in result', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const result = await validator.validatePackage(packageBuffer);

      expect(result.packageSize).toBe(packageBuffer.length);
    });
  });

  describe('SCORM version detection', () => {
    it('should correctly identify SCORM 1.2 from schemaversion', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const result = await validator.validatePackage(packageBuffer);

      expect(result.version).toBe('scorm_1.2');
    });

    it('should correctly identify SCORM 2004 from schemaversion', async () => {
      const packageBuffer = ScormTestHelper.createScorm2004Package();
      const result = await validator.validatePackage(packageBuffer);

      expect(result.version).toBe('scorm_2004');
    });
  });

  describe('Security validation', () => {
    it('should validate packages with absolute paths after sanitization', async () => {
      const zip = require('adm-zip');
      const testZip = new zip();

      const manifest = `<?xml version="1.0"?>
<manifest identifier="test" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations/>
  <resources/>
</manifest>`;

      testZip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));
      testZip.addFile('/etc/passwd', Buffer.from('malicious', 'utf-8'));

      const result = await validator.validatePackage(testZip.toBuffer());

      // Valid after sanitization
      expect(result.isValid).toBe(true);
    });

    it('should validate packages with null bytes after sanitization', async () => {
      const zip = require('adm-zip');
      const testZip = new zip();

      const manifest = `<?xml version="1.0"?>
<manifest identifier="test" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations/>
  <resources/>
</manifest>`;

      testZip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));
      testZip.addFile('file\0name.html', Buffer.from('test', 'utf-8'));

      const result = await validator.validatePackage(testZip.toBuffer());

      // Valid after sanitization (null bytes removed)
      expect(result.isValid).toBe(true);
    });
  });
});
