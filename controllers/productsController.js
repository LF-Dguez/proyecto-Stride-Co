var createController = require('./base');

module.exports = createController({
  name: 'products',
  idType: 'int',
  required: ['name', 'category_id', 'price'],
  items: [
    { id: 1, category_id: 1, name: 'Tenis Runner Pro', description: 'Tenis de running', brand: 'Stride', price: 1499.9, active: true },
    { id: 2, category_id: 2, name: 'Bota Trail', description: 'Bota para senderismo', brand: 'Stride', price: 1899, active: true }
  ]
});
