const createError = require('http-errors');
const { Inventory, ProductVariant } = require('../models/sql');
const { parseId, pickFields, toHttpError } = require('../utils/sequelizeHelpers');

const EDITABLE_FIELDS = ['variant_id', 'stock'];

const include = [{ model: ProductVariant, as: 'variant', attributes: ['id', 'sku', 'color', 'size'] }];

exports.getAll = async (req, res, next) => {
  try {
    const inventory = await Inventory.findAll({ include, order: [['id', 'ASC']] });
    res.status(200).json({ message: req.__('inventory.listed'), data: inventory });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const record = await Inventory.findByPk(id, { include });
    if (!record) throw createError(404, req.__('inventory.notFound'));
    res.status(200).json({ message: req.__('inventory.found', String(id)), data: record });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.create = async (req, res, next) => {
  try {
    const record = await Inventory.create(pickFields(req.body, EDITABLE_FIELDS));
    res.status(201).json({ message: req.__('inventory.created'), data: record });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const record = await Inventory.findByPk(id);
    if (!record) throw createError(404, req.__('inventory.notFound'));

    const changes = pickFields(req.body, EDITABLE_FIELDS);
    if (Object.keys(changes).length === 0) throw createError(400, req.__('common.noValidFields'));

    // El modelo valida stock >= 0: un stock negativo responde 400
    await record.update(changes);
    res.status(200).json({ message: req.__('inventory.updated', String(id)), data: record });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const record = await Inventory.findByPk(id);
    if (!record) throw createError(404, req.__('inventory.notFound'));

    await record.destroy();
    res.status(200).json({ message: req.__('inventory.deleted', String(id)) });
  } catch (err) {
    next(toHttpError(err, req));
  }
};
