import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs-extra';

/**
 * SCORM Test Helpers
 * Utilities for creating test SCORM packages
 */

export class ScormTestHelper {
  /**
   * Create a minimal valid SCORM 1.2 package
   */
  static createScorm12Package(): Buffer {
    const zip = new AdmZip();

    // Create imsmanifest.xml for SCORM 1.2
    const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.scorm12" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="default_org">
    <organization identifier="default_org">
      <title>Sample SCORM 1.2 Course</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>Lesson 1</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;

    // Create index.html
    const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <title>SCORM 1.2 Test Content</title>
  <script>
    var API = window.parent.API || window.opener.API;
    
    if (API) {
      API.LMSInitialize("");
      API.LMSSetValue("cmi.core.lesson_status", "completed");
      API.LMSSetValue("cmi.core.score.raw", "100");
      API.LMSSetValue("cmi.core.score.max", "100");
      API.LMSCommit("");
      API.LMSFinish("");
    }
  </script>
</head>
<body>
  <h1>SCORM 1.2 Test Content</h1>
  <p>This is a minimal SCORM 1.2 package for testing.</p>
</body>
</html>`;

    zip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));
    zip.addFile('index.html', Buffer.from(indexHtml, 'utf-8'));

    return zip.toBuffer();
  }

  /**
   * Create a minimal valid SCORM 2004 package
   */
  static createScorm2004Package(): Buffer {
    const zip = new AdmZip();

    // Create imsmanifest.xml for SCORM 2004
    const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.scorm2004" version="1.0"
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
          xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
          xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
          xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                              http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                              http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                              http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
                              http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="default_org">
    <organization identifier="default_org">
      <title>Sample SCORM 2004 Course</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>Lesson 1</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;

    // Create index.html
    const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <title>SCORM 2004 Test Content</title>
  <script>
    var API = window.parent.API_1484_11 || window.opener.API_1484_11;
    
    if (API) {
      API.Initialize("");
      API.SetValue("cmi.completion_status", "completed");
      API.SetValue("cmi.success_status", "passed");
      API.SetValue("cmi.score.raw", "100");
      API.SetValue("cmi.score.max", "100");
      API.Commit("");
      API.Terminate("");
    }
  </script>
</head>
<body>
  <h1>SCORM 2004 Test Content</h1>
  <p>This is a minimal SCORM 2004 package for testing.</p>
</body>
</html>`;

    zip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));
    zip.addFile('index.html', Buffer.from(indexHtml, 'utf-8'));

    return zip.toBuffer();
  }

  /**
   * Create an invalid package (missing imsmanifest.xml)
   */
  static createInvalidPackage(): Buffer {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html><body>No manifest</body></html>', 'utf-8'));
    return zip.toBuffer();
  }

  /**
   * Create a package with path traversal attempt
   */
  static createMaliciousPackage(): Buffer {
    const zip = new AdmZip();

    const manifest = `<?xml version="1.0"?>
<manifest identifier="malicious" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="default_org">
    <organization identifier="default_org">
      <title>Malicious Package</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>Lesson 1</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;

    zip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));
    zip.addFile('../../../etc/passwd', Buffer.from('malicious content', 'utf-8'));
    zip.addFile('index.html', Buffer.from('<html><body>Test</body></html>', 'utf-8'));

    return zip.toBuffer();
  }

  /**
   * Create a package with large file size
   */
  static createLargePackage(sizeInMB: number): Buffer {
    const zip = new AdmZip();

    const manifest = `<?xml version="1.0"?>
<manifest identifier="large" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations/>
  <resources/>
</manifest>`;

    zip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));

    // Create a large dummy file
    const largeContent = Buffer.alloc(sizeInMB * 1024 * 1024, 'x');
    zip.addFile('largefile.bin', largeContent);

    return zip.toBuffer();
  }

  /**
   * Save a package buffer to file
   */
  static async savePackageToFile(buffer: Buffer, filename: string): Promise<string> {
    const fixturesDir = path.join(__dirname, '../../../tests/fixtures/scorm');
    await fs.ensureDir(fixturesDir);

    const filePath = path.join(fixturesDir, filename);
    await fs.writeFile(filePath, buffer);

    return filePath;
  }

  /**
   * Clean up test fixtures
   */
  static async cleanupFixtures(): Promise<void> {
    const fixturesDir = path.join(__dirname, '../../../tests/fixtures/scorm');
    if (await fs.pathExists(fixturesDir)) {
      await fs.remove(fixturesDir);
    }
  }
}
