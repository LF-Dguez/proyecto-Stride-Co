const createError = require('http-errors');
const { ProductVariant, Product, Inventory } = require('../models/relationals');
const { parseId, pickFields, toHttpError } = require('../utils/sequelizeHelpers');

const EDITABLE_FIELDS = ['product_id', 'sku', 'color', 'size', 'active'];

const include = [
  { model: Product, as: 'product', attributes: ['id', 'name', 'brand', 'price'] },
  { model: Inventory, as: 'inventory' }
];

exports.getAll = async (req, res, next) => {
  try {
    const variants = await ProductVariant.findAll({ include, order: [['id', 'ASC']] });
    res.status(200).json({ message: 'GET variantes obtenido exitosamente', data: variants });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const variant = await ProductVariant.findByPk(id, { include });
    if (!variant) throw createError(404, 'Variante no encontrada');
    res.status(200).json({ message: `GET variante con ID ${id}`, data: variant });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.create = async (req, res, next) => {
  try {
    const variant = await ProductVariant.create(pickFields(req.body, EDITABLE_FIELDS));
    res.status(201).json({ message: 'Variante creada exitosamente', data: variant });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const variant = await ProductVariant.findByPk(id);
    if (!variant) throw createError(404, 'Variante no encontrada');

    const changes = pickFields(req.body, EDITABLE_FIELDS);
    if (Object.keys(changes).length === 0) throw createError(400, 'No hay datos válidos para actualizar');

    await variant.update(changes);
    res.status(200).json({ message: `Variante con ID ${id} actualizada exitosamente`, data: variant });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const variant = await ProductVariant.findByPk(id);
    if (!variant) throw createError(404, 'Variante no encontrada');

    await variant.destroy();
    res.status(200).json({ message: `Variante con ID ${id} eliminada exitosamente` });
  } catch (err) {
    next(toHttpError(err));
  }
};
