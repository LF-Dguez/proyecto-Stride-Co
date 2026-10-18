const createError = require('http-errors');
const Customer = require('../models/documents/Customer');
const { customerListFilter } = require('../services/ownership');

// Mongoose rechaza un id mal formado o datos que no pasan el schema; se traducen
// a errores HTTP en vez de dejarlos caer como 500.
function toHttpError(err) {
  if (err.name === 'CastError') return createError(400, 'Id de cliente inválido');
  if (err.name === 'ValidationError') return createError(400, err.message);
  return err;
}

// Campos que se pueden cambiar con PUT. `userId` (el dueño) no está en la lista:
// se fija al crear, para que un usuario con alcance own no pueda pasarse el
// registro a otra persona ni apropiarse de uno ajeno.
const EDITABLE_FIELDS = ['phone', 'email', 'addresses'];

function pickFields(body) {
  const fields = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (body && body[field] !== undefined) fields[field] = body[field];
  });
  return fields;
}

exports.getAll = async (req, res, next) => {
  try {
    // Con alcance own solo trae los clientes del usuario autenticado (services/ownership.js)
    const customers = await Customer.find(customerListFilter(req)).lean();
    res.status(200).json({ message: 'GET clientes obtenido exitosamente (Modelo Documental MongoDB)', data: customers });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) return next(createError(404, 'Cliente no encontrado'));
    res.status(200).json({ message: `GET cliente con ID ${req.params.id}`, data: customer });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.create = async (req, res, next) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ message: 'Cliente creado exitosamente', data: customer });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.update = async (req, res, next) => {
  try {
    const changes = pickFields(req.body);
    if (Object.keys(changes).length === 0) return next(createError(400, 'No hay datos válidos para actualizar'));
    const customer = await Customer.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true }).lean();
    if (!customer) return next(createError(404, 'Cliente no encontrado'));
    res.status(200).json({ message: `Cliente con ID ${req.params.id} actualizado exitosamente`, data: customer });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id).lean();
    if (!customer) return next(createError(404, 'Cliente no encontrado'));
    res.status(200).json({ message: `Cliente con ID ${req.params.id} eliminado exitosamente` });
  } catch (err) {
    next(toHttpError(err));
  }
};
