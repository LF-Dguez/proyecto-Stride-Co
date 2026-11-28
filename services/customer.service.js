// Acceso a datos de Customer/Order (MongoDB) para el panel (F12).
const { Customer, Order } = require('../models/mongo');

function listAll() {
  return Customer.find().sort({ createdAt: -1 }).lean();
}

async function getDetail(id) {
  const customer = await Customer.findById(id).lean();
  if (!customer) return null;
  const orders = await Order.find({ customerId: id }).sort({ createdAt: -1 }).lean();
  return { customer, orders };
}

module.exports = { listAll, getDetail };
