// F5: el servidor es la única fuente de verdad para precios, existencias y
// totales (sección 4.9); el navegador solo manda la dirección y el método de
// pago. Reserva inventario por variante y crea el pedido en MongoDB.
const { Inventory } = require('../models/sql');
const { Customer, Order } = require('../models/mongo');

const SHIPPING_COST = 150;

// Encuentra (o crea) el Customer ligado a este usuario, agregando la dirección
// nueva si no la tenía ya.
async function findOrCreateCustomer(user, address) {
  let customer = await Customer.findOne({ userId: user.id });
  if (!customer) {
    customer = await Customer.create({ userId: user.id, email: user.email, addresses: [address] });
  } else if (!customer.addresses.some((a) => a.street === address.street && a.postalCode === address.postalCode)) {
    customer.addresses.push(address);
    await customer.save();
  }
  return customer;
}

// lines ya viene resuelto contra la base de datos (cartService.resolveCart);
// aquí solo se vuelve a comprobar que siga alcanzando antes de reservar.
async function placeOrder({ userId, email, lines, address, paymentMethod }) {
  const insufficient = lines.filter((l) => !l.missing && l.quantity > l.available);
  if (lines.some((l) => l.missing) || insufficient.length) {
    const err = new Error('insufficient_stock');
    err.code = 'INSUFFICIENT_STOCK';
    throw err;
  }

  const customer = await findOrCreateCustomer({ id: userId, email }, address);

  // Reserva de inventario por variante (SQL): se suma a reserved, nunca se resta stock aquí.
  await Promise.all(lines.map(async (line) => {
    const inv = await Inventory.findOne({ where: { variant_id: line.variantId } });
    if (inv) await inv.update({ reserved: inv.reserved + line.quantity });
  }));

  const order = await Order.create({
    customerId: customer._id,
    status: 'PENDING',
    paymentMethod,
    shippingAddress: address,
    items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.price })),
    statusHistory: [{ status: 'PENDING', changedById: userId, note: 'Orden creada por el cliente' }],
    totals: { shipping: SHIPPING_COST }
  });

  return order;
}

module.exports = { placeOrder, findOrCreateCustomer, SHIPPING_COST };
