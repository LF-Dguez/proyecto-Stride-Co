const createError = require('http-errors');
const Customer = require('../models/documents/Customer');

// Mongoose rechaza un id mal formado o datos que no pasan el schema; se traducen
// a errores HTTP en vez de dejarlos caer como 500.
function toHttpError(err) {
  if (err.name === 'CastError') return createError(400, 'Id de cliente inválido');
  if (err.name === 'ValidationError') return createError(400, err.message);
  return err;
}

// Resolver de propiedad: un cliente es del usuario autenticado si su userId
// coincide con req.user.id. Lo usa authorize() en las rutas con alcance own.
async function resolveOwner(req) {
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) throw createError(404, 'Cliente no encontrado');
  return customer.userId;
}

exports.resolveOwner = resolveOwner;

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    // authorize() deja el alcance concedido en req.rbac.possession: 'own' acota
    // la lista al propio usuario autenticado; 'any' no filtra nada.
    if (req.rbac && req.rbac.possession === 'own') {
      filter.userId = req.user.id;
    }
    const customers = await Customer.find(filter).lean();
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
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
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
