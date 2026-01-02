import fs from 'fs';
import path from 'path';

describe('Migration inventory report', () => {
  const root = path.resolve(__dirname, '..', '..', '..');
  const reportPath = path.join(root, 'lms_node_devdocs', 'Class-Course-Program_Inventory_Report.md');

  it('exists and includes the collection names section', () => {
    const exists = fs.existsSync(reportPath);
    expect(exists).toBe(true);

    const contents = fs.readFileSync(reportPath, 'utf8');
    expect(contents).toContain('## Collection Names (Final)');
    expect(contents).toContain('`programlevels`');
    expect(contents).toContain('`coursecontents`');
  });
});
