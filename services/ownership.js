const createError = require('http-errors');
const Customer = require('../models/documents/Customer');
const Order = require('../models/documents/Order');

// Propiedad real de los recursos con alcance `own` (Tarea 6, sección 8).
// Estas funciones las usa el middleware authorize(); los controllers no deciden
// quién puede acceder a qué.

// Un id de MongoDB mal formado responde 400 aunque el error ocurra dentro de authorize()
function toHttpError(err, label) {
  if (err.name === 'CastError') return createError(400, `Id de ${label} inválido`);
  return err;
}

// Dueño de un cliente: Customer.userId
async function customerOwner(req) {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) throw createError(404, 'Cliente no encontrado');
    return customer.userId;
  } catch (err) {
    throw toHttpError(err, 'cliente');
  }
}

// Dueño de una orden: Order.customerId -> Customer.userId
async function orderOwner(req) {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw createError(404, 'Orden no encontrada');
    const customer = await Customer.findById(order.customerId).lean();
    return customer ? customer.userId : null;
  } catch (err) {
    throw toHttpError(err, 'orden');
  }
}

// En los listados, authorize() deja en req.rbac.possession el alcance concedido.
// Con 'own' la consulta se acota al usuario autenticado; con 'any' no se filtra.
function customerListFilter(req) {
  if (req.rbac && req.rbac.possession === 'own') return { userId: req.user.id };
  return {};
}

async function orderListFilter(req) {
  if (req.rbac && req.rbac.possession === 'own') {
    const customers = await Customer.find({ userId: req.user.id }).lean();
    return { customerId: { $in: customers.map((c) => c._id) } };
  }
  return {};
}

module.exports = { customerOwner, orderOwner, customerListFilter, orderListFilter };
