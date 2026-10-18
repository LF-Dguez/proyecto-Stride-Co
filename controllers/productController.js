const createError = require('http-errors');
const { Product, ProductVariant, Inventory } = require('../models/relationals');
const { parseId, pickFields, toHttpError } = require('../utils/sequelizeHelpers');

const EDITABLE_FIELDS = ['category_id', 'name', 'brand', 'price', 'active'];

// Al consultar productos se incluyen sus variantes y el stock de cada una
const include = [{
  model: ProductVariant,
  as: 'variants',
  include: [{ model: Inventory, as: 'inventory' }]
}];

exports.getAll = async (req, res, next) => {
  try {
    const products = await Product.findAll({ include, order: [['id', 'ASC']] });
    res.status(200).json({ message: 'GET productos obtenido exitosamente', data: products });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const product = await Product.findByPk(id, { include });
    if (!product) throw createError(404, 'Producto no encontrado');
    res.status(200).json({ message: `GET producto con ID ${id}`, data: product });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.create = async (req, res, next) => {
  try {
    const product = await Product.create(pickFields(req.body, EDITABLE_FIELDS));
    res.status(201).json({ message: 'Producto creado exitosamente', data: product });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const product = await Product.findByPk(id);
    if (!product) throw createError(404, 'Producto no encontrado');

    const changes = pickFields(req.body, EDITABLE_FIELDS);
    if (Object.keys(changes).length === 0) throw createError(400, 'No hay datos válidos para actualizar');

    await product.update(changes);
    res.status(200).json({ message: `Producto con ID ${id} actualizado exitosamente`, data: product });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const product = await Product.findByPk(id);
    if (!product) throw createError(404, 'Producto no encontrado');

    await product.destroy();
    res.status(200).json({ message: `Producto con ID ${id} eliminado exitosamente` });
  } catch (err) {
    next(toHttpError(err));
  }
};
