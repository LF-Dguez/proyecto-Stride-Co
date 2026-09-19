var createController = require('./base');

module.exports = createController({
  name: 'variants',
  idType: 'int',
  required: ['product_id', 'sku', 'size'],
  items: [
    { id: 1, product_id: 1, sku: 'RUN-PRO-42-BLK', size: '42', color: 'negro', active: true },
    { id: 2, product_id: 1, sku: 'RUN-PRO-43-WHT', size: '43', color: 'blanco', active: true }
  ]
});
