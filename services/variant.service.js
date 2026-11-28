// Acceso a datos de ProductVariant para el panel (F9), compartido por los
// controllers web igual que product.service.js (sección 4.4).
const { ProductVariant, Product, Inventory } = require('../models/sql');

const include = [
  { model: Product, as: 'product' },
  { model: Inventory, as: 'inventory' }
];

function listAll() {
  return ProductVariant.findAll({ include, order: [['id', 'ASC']] });
}

function getById(id) {
  return ProductVariant.findByPk(id, { include });
}

// Cada variante nueva trae su propio registro de inventario en 0/0: F10 ajusta
// existencias y reservadas después, nunca los crea.
async function createVariant(fields) {
  const variant = await ProductVariant.create(fields);
  await Inventory.create({ variant_id: variant.id, stock: 0, reserved: 0 });
  return variant;
}

async function updateVariant(id, fields) {
  const variant = await ProductVariant.findByPk(id);
  if (!variant) return null;
  return variant.update(fields);
}

module.exports = { listAll, getById, createVariant, updateVariant };
