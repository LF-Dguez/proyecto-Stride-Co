// Acceso a datos de Product compartido entre la API y las vistas SSR (sección 4.4 del PDF).
// Aún no existe un modelo Category (ver models/sql/Product.js); category_id se usa
// directamente como filtro y esta tabla solo le pone una etiqueta para mostrarlo.
const { Op } = require('sequelize');
const { Product, ProductVariant, Inventory } = require('../models/sql');

const CATEGORY_LABELS = { 10: 'Running', 20: 'Urbano', 30: 'Outdoor' };

const PAGE_SIZE = 8;

const VARIANT_INVENTORY_INCLUDE = [{
  model: ProductVariant,
  as: 'variants',
  include: [{ model: Inventory, as: 'inventory' }]
}];

async function listActive({ q = '', category = '', page = 1 } = {}) {
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const where = { active: true };
  if (q) where.name = { [Op.iLike]: `%${q}%` };
  if (category) where.category_id = Number(category);

  const { rows, count } = await Product.findAndCountAll({
    where,
    order: [['id', 'ASC']],
    limit: PAGE_SIZE,
    offset: (pageNum - 1) * PAGE_SIZE
  });

  return { products: rows, page: pageNum, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

function listFeatured(limit = 4) {
  return Product.findAll({ where: { active: true }, order: [['id', 'ASC']], limit });
}

function getActiveById(id) {
  return Product.findOne({ where: { id, active: true }, include: VARIANT_INVENTORY_INCLUDE });
}

// A diferencia de listActive/getActiveById (tienda, solo lo que está activo),
// el panel (F8) necesita ver y editar también los productos desactivados.
// Para el <select> de producto en formularios del panel (variantes, etc.)
function listAllForSelect() {
  return Product.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] });
}

async function listAdmin({ page = 1 } = {}) {
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const { rows, count } = await Product.findAndCountAll({
    order: [['id', 'ASC']],
    limit: PAGE_SIZE,
    offset: (pageNum - 1) * PAGE_SIZE
  });
  return { products: rows, page: pageNum, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

function getById(id) {
  return Product.findByPk(id);
}

function createProduct(fields) {
  return Product.create(fields);
}

async function updateProduct(id, fields) {
  const product = await Product.findByPk(id);
  if (!product) return null;
  return product.update(fields);
}

async function setActive(id, active) {
  const product = await Product.findByPk(id);
  if (!product) return null;
  return product.update({ active });
}

// Borrado real (a diferencia de setActive): falla con FK si hay variantes
// relacionadas, lo que utils/sequelizeHelpers#toHttpError traduce a 409.
async function deleteProduct(id) {
  const product = await Product.findByPk(id);
  if (!product) return null;
  await product.destroy();
  return product;
}

module.exports = {
  CATEGORY_LABELS, listActive, listFeatured, getActiveById,
  listAdmin, getById, createProduct, updateProduct, setActive, deleteProduct, listAllForSelect
};
