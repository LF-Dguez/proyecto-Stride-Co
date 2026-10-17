const createError = require('http-errors');
const Order = require('../models/documents/Order');
const Customer = require('../models/documents/Customer');

// Mongoose rechaza un id mal formado o datos que no pasan el schema; se traducen
// a errores HTTP en vez de dejarlos caer como 500.
function toHttpError(err) {
  if (err.name === 'CastError') return createError(400, 'Id de orden inválido');
  if (err.name === 'ValidationError') return createError(400, err.message);
  return err;
}

// Resolver de propiedad (issue #51): una orden es del usuario autenticado si su
// customerId apunta a un Customer cuyo userId coincide con req.user.id. Lo usa
// authorize() en las rutas de lectura/actualización con alcance own; si la orden
// no existe, el 404 sale desde aquí y lo atrapa el manejador de errores.
async function resolveOwner(req) {
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw createError(404, 'Orden no encontrada');
  const customer = await Customer.findById(order.customerId).lean();
  return customer ? customer.userId : null;
}

exports.resolveOwner = resolveOwner;

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    // authorize() deja el alcance concedido en req.rbac.possession: 'own' acota
    // la lista a las órdenes del usuario autenticado; 'any' no filtra nada.
    if (req.rbac && req.rbac.possession === 'own') {
      const customers = await Customer.find({ userId: req.user.id }).lean();
      filter.customerId = { $in: customers.map((c) => c._id) };
    }
    const orders = await Order.find(filter).lean();
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
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
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
