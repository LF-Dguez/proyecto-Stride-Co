const createError = require('http-errors');
const Order = require('../models/documents/Order');
const { orderListFilter } = require('../services/ownership');

// Mongoose rechaza un id mal formado o datos que no pasan el schema; se traducen
// a errores HTTP en vez de dejarlos caer como 500.
function toHttpError(err) {
  if (err.name === 'CastError') return createError(400, 'Id de orden inválido');
  if (err.name === 'ValidationError') return createError(400, err.message);
  return err;
}

// Campos que se pueden cambiar con PUT. `customerId` (el dueño) no está en la lista:
// se fija al crear, para que un usuario con alcance own no pueda pasarse el
// registro a otra persona ni apropiarse de uno ajeno.
const EDITABLE_FIELDS = ['salesPersonId', 'status', 'paymentMethod', 'items', 'totals'];

function pickFields(body) {
  const fields = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (body && body[field] !== undefined) fields[field] = body[field];
  });
  return fields;
}

exports.getAll = async (req, res, next) => {
  try {
    // Con alcance own solo trae las órdenes del usuario autenticado (services/ownership.js)
    const orders = await Order.find(await orderListFilter(req)).lean();
    res.status(200).json({ message: 'GET órdenes obtenido exitosamente (Modelo Documental MongoDB)', data: orders });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return next(createError(404, 'Orden no encontrada'));
    res.status(200).json({ message: `GET orden con ID ${req.params.id}`, data: order });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.create = async (req, res, next) => {
  try {
    const order = await Order.create(req.body);
    res.status(201).json({ message: 'Orden creada exitosamente', data: order });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.update = async (req, res, next) => {
  try {
    const changes = pickFields(req.body);
    if (Object.keys(changes).length === 0) return next(createError(400, 'No hay datos válidos para actualizar'));
    const order = await Order.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true }).lean();
    if (!order) return next(createError(404, 'Orden no encontrada'));
    res.status(200).json({ message: `Orden con ID ${req.params.id} actualizada exitosamente`, data: order });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id).lean();
    if (!order) return next(createError(404, 'Orden no encontrada'));
    res.status(200).json({ message: `Orden con ID ${req.params.id} eliminada exitosamente` });
  } catch (err) {
    next(toHttpError(err));
  }
};
