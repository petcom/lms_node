/**
 * Mock for uuid module to work with Jest
 */

const { randomUUID } = require('crypto');

module.exports = {
  v4: () => randomUUID(),
  v1: () => randomUUID(),
  v3: () => randomUUID(),
  v5: () => randomUUID(),
  NIL: '00000000-0000-0000-0000-000000000000',
  parse: (uuid) => Buffer.from(uuid.replace(/-/g, ''), 'hex'),
  stringify: (arr) => {
    const hex = Buffer.from(arr).toString('hex');
    return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
  },
  validate: (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid),
  version: (uuid) => parseInt(uuid.charAt(14), 16),
};
