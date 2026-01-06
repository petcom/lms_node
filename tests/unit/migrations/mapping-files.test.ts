import fs from 'fs';
import path from 'path';

interface ClassLevelPayload {
  programId: string;
  order: number;
}

const readJson = (filePath: string): Record<string, unknown> => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const isObjectId = (value: string): boolean => /^[a-fA-F0-9]{24}$/.test(value);

describe('Migration mapping files', () => {
  const root = path.resolve(__dirname, '..', '..', '..');

  it('loads classlevel-to-programlevel map', () => {
    const filePath = path.join(
      root,
      'lms_node_devdocs',
      'migrations',
      'classlevel-to-programlevel.map.json'
    );
    const data = readJson(filePath);

    expect(typeof data).toBe('object');
    const entries = Object.entries(data) as [string, ClassLevelPayload][];
    expect(entries.length).toBeGreaterThan(0);

    for (const [classLevelId, payload] of entries) {
      expect(isObjectId(classLevelId)).toBe(true);
      expect(payload).toEqual(
        expect.objectContaining({
          programId: expect.any(String),
          order: expect.any(Number),
        })
      );
      expect(isObjectId(payload.programId)).toBe(true);
      expect(payload.order).toBeGreaterThan(0);
    }
  });

  it('loads scorm-to-coursecontent map', () => {
    const filePath = path.join(
      root,
      'lms_node_devdocs',
      'migrations',
      'scorm-to-coursecontent.map.json'
    );
    const data = readJson(filePath);

    expect(typeof data).toBe('object');
    const entries = Object.entries(data) as [string, string][];
    expect(entries.length).toBeGreaterThan(0);

    for (const [scormPackageId, courseContentId] of entries) {
      expect(isObjectId(scormPackageId)).toBe(true);
      expect(typeof courseContentId).toBe('string');
      expect(isObjectId(courseContentId)).toBe(true);
    }
  });
});
