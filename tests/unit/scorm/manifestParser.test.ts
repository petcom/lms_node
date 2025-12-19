import { ManifestParser } from '../../../utils/scorm/manifestParser';
import { ScormTestHelper } from '../../helpers/scormTestHelper';
import AdmZip from 'adm-zip';

describe('ManifestParser', () => {
  let parser: ManifestParser;

  beforeEach(() => {
    parser = new ManifestParser();
  });

  describe('parse', () => {
    it('should parse a valid SCORM 1.2 manifest', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const zip = new AdmZip(packageBuffer);
      const manifestEntry = zip.getEntry('imsmanifest.xml');
      const manifestXml = manifestEntry!.getData().toString('utf-8');

      const result = await parser.parse(manifestXml);

      expect(result.identifier).toBe('com.example.scorm12');
      expect(result.version).toBe('scorm_1.2');
      expect(result.organizations).toBeDefined();
      expect(result.organizations.length).toBeGreaterThan(0);
      expect(result.resources).toBeDefined();
      expect(result.resources.length).toBeGreaterThan(0);
    });

    it('should parse a valid SCORM 2004 manifest', async () => {
      const packageBuffer = ScormTestHelper.createScorm2004Package();
      const zip = new AdmZip(packageBuffer);
      const manifestEntry = zip.getEntry('imsmanifest.xml');
      const manifestXml = manifestEntry!.getData().toString('utf-8');

      const result = await parser.parse(manifestXml);

      expect(result.identifier).toBe('com.example.scorm2004');
      expect(result.version).toBe('scorm_2004');
      expect(result.organizations.length).toBeGreaterThan(0);
      expect(result.resources.length).toBeGreaterThan(0);
    });

    it('should extract organizations correctly', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const zip = new AdmZip(packageBuffer);
      const manifestEntry = zip.getEntry('imsmanifest.xml');
      const manifestXml = manifestEntry!.getData().toString('utf-8');

      const result = await parser.parse(manifestXml);

      expect(result.organizations[0].identifier).toBe('default_org');
      expect(result.organizations[0].title).toBe('Sample SCORM 1.2 Course');
      expect(result.organizations[0].items).toBeDefined();
      expect(result.organizations[0].items.length).toBeGreaterThan(0);
    });

    it('should extract resources correctly', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const zip = new AdmZip(packageBuffer);
      const manifestEntry = zip.getEntry('imsmanifest.xml');
      const manifestXml = manifestEntry!.getData().toString('utf-8');

      const result = await parser.parse(manifestXml);

      expect(result.resources[0].identifier).toBe('resource_1');
      expect(result.resources[0].type).toBe('webcontent');
      expect(result.resources[0].href).toBe('index.html');
    });

    it('should extract metadata when present', async () => {
      const manifestWithMetadata = `<?xml version="1.0"?>
<manifest identifier="test" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
    <lom>
      <general>
        <title><langstring>Test Title</langstring></title>
        <description><langstring>Test Description</langstring></description>
        <keyword><langstring>test</langstring></keyword>
        <keyword><langstring>scorm</langstring></keyword>
      </general>
    </lom>
  </metadata>
  <organizations/>
  <resources/>
</manifest>`;

      const result = await parser.parse(manifestWithMetadata);

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.title).toBe('Test Title');
      expect(result.metadata!.description).toBe('Test Description');
      expect(result.metadata!.keywords).toContain('test');
      expect(result.metadata!.keywords).toContain('scorm');
    });

    it('should throw error for invalid XML', async () => {
      const invalidXml = 'This is not XML';

      await expect(parser.parse(invalidXml)).rejects.toThrow('Failed to parse manifest');
    });

    it('should throw error for missing manifest root element', async () => {
      const xmlWithoutManifest = `<?xml version="1.0"?>
<not-manifest>
  <data>test</data>
</not-manifest>`;

      await expect(parser.parse(xmlWithoutManifest)).rejects.toThrow(
        'Invalid manifest: missing root <manifest> element'
      );
    });

    it('should parse nested items in organizations', async () => {
      const nestedManifest = `<?xml version="1.0"?>
<manifest identifier="nested" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>Course Title</title>
      <item identifier="item1">
        <title>Module 1</title>
        <item identifier="item1.1" identifierref="res1">
          <title>Lesson 1.1</title>
        </item>
        <item identifier="item1.2" identifierref="res2">
          <title>Lesson 1.2</title>
        </item>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" type="webcontent" href="lesson1.html">
      <file href="lesson1.html"/>
    </resource>
    <resource identifier="res2" type="webcontent" href="lesson2.html">
      <file href="lesson2.html"/>
    </resource>
  </resources>
</manifest>`;

      const result = await parser.parse(nestedManifest);

      expect(result.organizations[0].items[0].children).toBeDefined();
      expect(result.organizations[0].items[0].children!.length).toBe(2);
      expect(result.organizations[0].items[0].children![0].title).toBe('Lesson 1.1');
    });
  });

  describe('getLaunchUrl', () => {
    it('should determine the correct launch URL from manifest', async () => {
      const packageBuffer = ScormTestHelper.createScorm12Package();
      const zip = new AdmZip(packageBuffer);
      const manifestEntry = zip.getEntry('imsmanifest.xml');
      const manifestXml = manifestEntry!.getData().toString('utf-8');

      const manifestData = await parser.parse(manifestXml);
      const launchUrl = parser.getLaunchUrl(manifestData);

      expect(launchUrl).toBe('index.html');
    });

    it('should fallback to index.html if no launch URL found', async () => {
      const manifestData = {
        identifier: 'test',
        version: 'scorm_1.2' as const,
        organizations: [],
        resources: [],
      };

      const launchUrl = parser.getLaunchUrl(manifestData);

      expect(launchUrl).toBe('index.html');
    });

    it('should use first resource if organization is empty', async () => {
      const manifestData = {
        identifier: 'test',
        version: 'scorm_1.2' as const,
        organizations: [],
        resources: [
          {
            identifier: 'res1',
            type: 'webcontent',
            href: 'custom-launch.html',
          },
        ],
      };

      const launchUrl = parser.getLaunchUrl(manifestData);

      expect(launchUrl).toBe('custom-launch.html');
    });
  });

  describe('Version detection', () => {
    it('should detect SCORM 1.2 from schemaversion', async () => {
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

      const result = await parser.parse(manifest);
      expect(result.version).toBe('scorm_1.2');
    });

    it('should detect SCORM 2004 from schemaversion', async () => {
      const manifest = `<?xml version="1.0"?>
<manifest identifier="test" version="1.0"
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations/>
  <resources/>
</manifest>`;

      const result = await parser.parse(manifest);
      expect(result.version).toBe('scorm_2004');
    });

    it('should detect SCORM 1.2 from namespace', async () => {
      const manifest = `<?xml version="1.0"?>
<manifest identifier="test" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
  </metadata>
  <organizations/>
  <resources/>
</manifest>`;

      const result = await parser.parse(manifest);
      expect(result.version).toBe('scorm_1.2');
    });

    it('should default to SCORM 1.2 if version cannot be determined', async () => {
      const manifest = `<?xml version="1.0"?>
<manifest identifier="test" version="1.0">
  <organizations/>
  <resources/>
</manifest>`;

      const result = await parser.parse(manifest);
      expect(result.version).toBe('scorm_1.2');
    });
  });

  describe('Edge cases', () => {
    it('should handle manifest without metadata', async () => {
      const manifest = `<?xml version="1.0"?>
<manifest identifier="test" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <organizations/>
  <resources/>
</manifest>`;

      const result = await parser.parse(manifest);

      expect(result.metadata).toBeUndefined();
    });

    it('should handle empty organizations', async () => {
      const manifest = `<?xml version="1.0"?>
<manifest identifier="test" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations/>
  <resources/>
</manifest>`;

      const result = await parser.parse(manifest);

      expect(result.organizations).toEqual([]);
    });

    it('should handle empty resources', async () => {
      const manifest = `<?xml version="1.0"?>
<manifest identifier="test" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations/>
  <resources/>
</manifest>`;

      const result = await parser.parse(manifest);

      expect(result.resources).toEqual([]);
    });
  });
});
