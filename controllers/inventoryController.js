var createController = require('./base');

// Inventory is 1:1 with a variant, so records are identified by variant_id.
module.exports = createController({
  name: 'inventory',
  idType: 'int',
  idField: 'variant_id',
  required: ['variant_id', 'stock'],
  items: [
    { variant_id: 1, stock: 25, reserved: 3, updated_at: '2026-09-01T10:00:00Z' },
    { variant_id: 2, stock: 10, reserved: 0, updated_at: '2026-09-01T10:00:00Z' }
  ]
});
