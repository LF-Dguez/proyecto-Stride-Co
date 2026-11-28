// Acceso a datos de Order/Customer (MongoDB) para el panel administrativo (F11),
// compartido por los controllers web igual que product.service.js (sección 4.4).
const { Order, Customer } = require('../models/mongo');
const { Product } = require('../models/sql');

const STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const CUSTOMER_POPULATE = { path: 'customerId', select: 'phone email addresses' };

function listOrders({ status = '' } = {}) {
  const filter = status ? { status } : {};
  return Order.find(filter).sort({ createdAt: -1 }).populate(CUSTOMER_POPULATE).lean();
}

function listRecent(limit = 5) {
  return Order.find().sort({ createdAt: -1 }).limit(limit).populate(CUSTOMER_POPULATE).lean();
}

// Los items solo guardan productId (Tarea 6): se resuelven los nombres en SQL
// para mostrarlos, sin duplicar esa consulta en cada controller.
async function getOrderDetail(id) {
  const order = await Order.findById(id).populate(CUSTOMER_POPULATE).lean();
  if (!order) return null;

  const ids = [...new Set(order.items.map((item) => item.productId))];
  const products = ids.length ? await Product.findAll({ where: { id: ids } }) : [];
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  return {
    ...order,
    items: order.items.map((item) => ({ ...item, productName: nameById.get(item.productId) || `#${item.productId}` }))
  };
}

// Agrega una entrada a statusHistory (nunca sobrescribe las anteriores, sección 4.9)
async function appendStatusChange(id, { status, note, changedById }) {
  const order = await Order.findById(id);
  if (!order) return null;
  order.status = status;
  order.statusHistory.push({ status, changedById, note: note || undefined });
  await order.save();
  return order;
}

// F6: solo los pedidos del cliente ligado a este usuario (orders:read:own).
async function listMine(userId) {
  const customer = await Customer.findOne({ userId }).lean();
  if (!customer) return [];
  return Order.find({ customerId: customer._id }).sort({ createdAt: -1 }).lean();
}

module.exports = { STATUSES, listOrders, listRecent, getOrderDetail, appendStatusChange, listMine };
