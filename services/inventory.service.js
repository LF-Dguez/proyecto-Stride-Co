// Acceso a datos de Inventory para el panel (F10), compartido por los
// controllers web igual que product.service.js (sección 4.4).
const { Inventory, ProductVariant, Product } = require('../models/sql');

const include = [{
  model: ProductVariant,
  as: 'variant',
  include: [{ model: Product, as: 'product' }]
}];

function listAll() {
  return Inventory.findAll({ include, order: [['id', 'ASC']] });
}

// 0 <= reserved <= stock se valida en el controller antes de llamar aquí
// (sección 4.9: las reglas de negocio son responsabilidad del servidor).
async function adjust(variantId, { stock, reserved }) {
  const inventory = await Inventory.findOne({ where: { variant_id: variantId } });
  if (!inventory) return null;
  return inventory.update({ stock, reserved });
}

module.exports = { listAll, adjust };
