// Datos de ejemplo del modelo documental (MongoDB): clientes y órdenes.
// Los clientes se enlazan con los usuarios de demostración por userId, y las órdenes usan los
// productos y los precios sembrados en PostgreSQL (ver sampleSql.js).
// Cada documento lleva un _id fijo, así que el seed es idempotente: se puede ejecutar varias veces.

const { USERS } = require('./rbacMatrix');
const { SAMPLE_PRODUCTS } = require('./sampleSql');

const IDS = {
  customerUser: '65a000000000000000000001',
  customerWalkIn: '65a000000000000000000002',
  orderUserPaid: '65b000000000000000000001',
  orderUserPending: '65b000000000000000000002',
  orderWalkIn: '65b000000000000000000003'
};

// { admin: 1, sales: 2, user: 3 } a partir de los usuarios de demostración sembrados en PostgreSQL
function buildUserIds(users) {
  const ids = {};
  USERS.forEach(({ role, email }) => {
    const user = users.find((u) => u.email === email);
    if (!user) throw new Error(`Falta el usuario de demostración ${email}: ejecuta primero el seed SQL`);
    ids[role] = user.id;
  });
  return ids;
}

// { 'Tenis Runner Pro': { id, price } } a partir de los productos sembrados en PostgreSQL.
// Sequelize devuelve DECIMAL como texto, por eso el precio se convierte a número.
function buildCatalog(products) {
  const catalog = {};
  SAMPLE_PRODUCTS.forEach(({ name }) => {
    const product = products.find((p) => p.name === name);
    if (!product) throw new Error(`Falta el producto "${name}": ejecuta primero el seed SQL`);
    catalog[name] = { id: product.id, price: Number(product.price) };
  });
  return catalog;
}

function buildSampleDocuments({ userIds, catalog }) {
  const item = (name, quantity) => ({ productId: catalog[name].id, quantity, unitPrice: catalog[name].price });

  const addressUser = {
    street: 'Av. Universidad', number: '1200', city: 'Chihuahua', state: 'Chihuahua', postalCode: '31000', country: 'México'
  };
  const addressWalkIn = {
    street: 'Calle Aldama', number: '45', city: 'Chihuahua', state: 'Chihuahua', postalCode: '31100', country: 'México'
  };

  const customers = [
    {
      // Cliente del usuario de demostración con rol user: sirve para probar el alcance own
      _id: IDS.customerUser,
      userId: userIds.user,
      phone: '6141234567',
      email: 'user@stride.co',
      addresses: [{ type: 'SHIPPING', ...addressUser }, { type: 'BILLING', ...addressUser }]
    },
    {
      // Cliente de mostrador, sin cuenta de usuario: sus órdenes no pertenecen al usuario user
      _id: IDS.customerWalkIn,
      phone: '6149876543',
      email: 'cliente.mostrador@stride.co',
      addresses: [{ type: 'SHIPPING', ...addressWalkIn }]
    }
  ];

  const orders = [
    {
      _id: IDS.orderUserPaid,
      customerId: IDS.customerUser,
      salesPersonId: userIds.sales,
      status: 'PAID',
      paymentMethod: 'CARD',
      shippingAddress: addressUser,
      items: [item('Tenis Runner Pro', 1), item('Sandalia Urban', 2)],
      totals: { shipping: 99, discount: 0 },
      statusHistory: [
        { status: 'PENDING', changedById: userIds.sales, note: 'Orden creada' },
        { status: 'PAID', changedById: userIds.sales, note: 'Pago con tarjeta confirmado' }
      ]
    },
    {
      _id: IDS.orderUserPending,
      customerId: IDS.customerUser,
      status: 'PENDING',
      paymentMethod: 'TRANSFER',
      shippingAddress: addressUser,
      items: [item('Bota Hiker', 1)],
      totals: { shipping: 150, discount: 0 },
      statusHistory: [{ status: 'PENDING', changedById: userIds.user, note: 'Orden creada por el cliente' }]
    },
    {
      _id: IDS.orderWalkIn,
      customerId: IDS.customerWalkIn,
      salesPersonId: userIds.sales,
      status: 'DELIVERED',
      paymentMethod: 'CASH',
      shippingAddress: addressWalkIn,
      items: [item('Tenis Trail X', 1), item('Tenis Runner Pro', 1)],
      totals: { shipping: 0, discount: 100 },
      statusHistory: [
        { status: 'PENDING', changedById: userIds.sales },
        { status: 'PAID', changedById: userIds.sales },
        { status: 'SHIPPED', changedById: userIds.sales },
        { status: 'DELIVERED', changedById: userIds.sales, note: 'Entregada en tienda' }
      ]
    }
  ];

  return { customers, orders };
}

// Recibe los modelos como parámetro para poder probarlo con mocks, sin MongoDB.
// Si un cliente ya existe pero su userId cambió (por ejemplo, la base de PostgreSQL se recreó),
// se vuelve a sincronizar para que el alcance own siga funcionando.
async function seedSampleMongo({ Customer, Order, userIds, catalog }) {
  const { customers, orders } = buildSampleDocuments({ userIds, catalog });
  const result = { customers: { created: 0, updated: 0 }, orders: { created: 0 } };

  for (const customer of customers) {
    const existing = await Customer.findById(customer._id).lean();
    if (!existing) {
      await Customer.create(customer);
      result.customers.created += 1;
    } else if (existing.userId !== customer.userId) {
      await Customer.updateOne({ _id: customer._id }, { userId: customer.userId });
      result.customers.updated += 1;
    }
  }

  for (const order of orders) {
    const existing = await Order.findById(order._id).lean();
    if (existing) continue;
    // create() ejecuta las validaciones del modelo y calcula subtotal y total
    await Order.create(order);
    result.orders.created += 1;
  }

  return result;
}

module.exports = { seedSampleMongo, buildSampleDocuments, buildCatalog, buildUserIds, IDS };