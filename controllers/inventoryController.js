const createError = require('http-errors');
const { Inventory, ProductVariant } = require('../models/relationals');
const { parseId, pickFields, toHttpError } = require('../utils/sequelizeHelpers');

const EDITABLE_FIELDS = ['variant_id', 'stock'];

const include = [{ model: ProductVariant, as: 'variant', attributes: ['id', 'sku', 'color', 'size'] }];

exports.getAll = async (req, res, next) => {
  try {
    const inventory = await Inventory.findAll({ include, order: [['id', 'ASC']] });
    res.status(200).json({ message: 'GET inventario obtenido exitosamente', data: inventory });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const record = await Inventory.findByPk(id, { include });
    if (!record) throw createError(404, 'Registro de inventario no encontrado');
    res.status(200).json({ message: `GET inventario con ID ${id}`, data: record });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.create = async (req, res, next) => {
  try {
    const record = await Inventory.create(pickFields(req.body, EDITABLE_FIELDS));
    res.status(201).json({ message: 'Registro de inventario creado exitosamente', data: record });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const record = await Inventory.findByPk(id);
    if (!record) throw createError(404, 'Registro de inventario no encontrado');

    const changes = pickFields(req.body, EDITABLE_FIELDS);
    if (Object.keys(changes).length === 0) throw createError(400, 'No hay datos válidos para actualizar');

    // El modelo valida stock >= 0: un stock negativo responde 400
    await record.update(changes);
    res.status(200).json({ message: `Inventario con ID ${id} actualizado exitosamente`, data: record });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const record = await Inventory.findByPk(id);
    if (!record) throw createError(404, 'Registro de inventario no encontrado');

    await record.destroy();
    res.status(200).json({ message: `Registro de inventario con ID ${id} eliminado exitosamente` });
  } catch (err) {
    next(toHttpError(err));
  }
};
