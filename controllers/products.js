const createError = require('http-errors');
const { Product, ProductVariant, Inventory } = require('../models/sql');
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
    res.status(200).json({ message: req.__('products.listed'), data: products });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const product = await Product.findByPk(id, { include });
    if (!product) throw createError(404, req.__('products.notFound'));
    res.status(200).json({ message: req.__('products.found', String(id)), data: product });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.create = async (req, res, next) => {
  try {
    const product = await Product.create(pickFields(req.body, EDITABLE_FIELDS));
    res.status(201).json({ message: req.__('products.created'), data: product });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const product = await Product.findByPk(id);
    if (!product) throw createError(404, req.__('products.notFound'));

    const changes = pickFields(req.body, EDITABLE_FIELDS);
    if (Object.keys(changes).length === 0) throw createError(400, req.__('common.noValidFields'));

    await product.update(changes);
    res.status(200).json({ message: req.__('products.updated', String(id)), data: product });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const product = await Product.findByPk(id);
    if (!product) throw createError(404, req.__('products.notFound'));

    await product.destroy();
    res.status(200).json({ message: req.__('products.deleted', String(id)) });
  } catch (err) {
    next(toHttpError(err, req));
  }
};
