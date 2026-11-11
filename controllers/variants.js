const createError = require('http-errors');
const { ProductVariant, Product, Inventory } = require('../models/sql');
const { parseId, pickFields, toHttpError } = require('../utils/sequelizeHelpers');

const EDITABLE_FIELDS = ['product_id', 'sku', 'color', 'size', 'active'];

const include = [
  { model: Product, as: 'product', attributes: ['id', 'name', 'brand', 'price'] },
  { model: Inventory, as: 'inventory' }
];

exports.getAll = async (req, res, next) => {
  try {
    const variants = await ProductVariant.findAll({ include, order: [['id', 'ASC']] });
    res.status(200).json({ message: req.__('variants.listed'), data: variants });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const variant = await ProductVariant.findByPk(id, { include });
    if (!variant) throw createError(404, req.__('variants.notFound'));
    res.status(200).json({ message: req.__('variants.found', String(id)), data: variant });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.create = async (req, res, next) => {
  try {
    const variant = await ProductVariant.create(pickFields(req.body, EDITABLE_FIELDS));
    res.status(201).json({ message: req.__('variants.created'), data: variant });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const variant = await ProductVariant.findByPk(id);
    if (!variant) throw createError(404, req.__('variants.notFound'));

    const changes = pickFields(req.body, EDITABLE_FIELDS);
    if (Object.keys(changes).length === 0) throw createError(400, req.__('common.noValidFields'));

    await variant.update(changes);
    res.status(200).json({ message: req.__('variants.updated', String(id)), data: variant });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const variant = await ProductVariant.findByPk(id);
    if (!variant) throw createError(404, req.__('variants.notFound'));

    await variant.destroy();
    res.status(200).json({ message: req.__('variants.deleted', String(id)) });
  } catch (err) {
    next(toHttpError(err, req));
  }
};
