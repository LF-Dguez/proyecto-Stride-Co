const Customer = require('../models/mongo/Customer');
const Order = require('../models/mongo/Order');
const { SAMPLE_PRODUCTS } = require('../seeders/sampleSql');
const {
  seedSampleMongo, buildSampleDocuments, buildCatalog, buildUserIds, IDS
} = require('../seeders/sampleMongo');

const userIds = { admin: 1, sales: 2, user: 3 };
// Sequelize devuelve DECIMAL como texto
const products = SAMPLE_PRODUCTS.map((p, index) => ({ id: index + 1, name: p.name, price: p.price.toFixed(2) }));
const catalog = buildCatalog(products);

describe('buildCatalog y buildUserIds', () => {
  it('convierte el precio de PostgreSQL a número y conserva el id', () => {
    expect(catalog['Tenis Runner Pro']).toEqual({ id: 1, price: 1299.99 });
  });

  it('falla con un mensaje claro si falta un producto sembrado', () => {
    expect(() => buildCatalog([])).toThrow(/seed SQL/);
  });

  it('relaciona cada rol con el id de su usuario de demostración', () => {
    const users = [
      { id: 7, email: 'admin@stride.co' },
      { id: 8, email: 'sales@stride.co' },
      { id: 9, email: 'user@stride.co' }
    ];
    expect(buildUserIds(users)).toEqual({ admin: 7, sales: 8, user: 9 });
  });

  it('falla con un mensaje claro si falta un usuario de demostración', () => {
    expect(() => buildUserIds([])).toThrow(/seed SQL/);
  });
});

describe('documentos de ejemplo', () => {
  const { customers, orders } = buildSampleDocuments({ userIds, catalog });

  it('el cliente del usuario user lleva su userId', () => {
    expect(customers.find((c) => c._id === IDS.customerUser).userId).toBe(userIds.user);
  });

  it('hay al menos una orden del usuario user y una de otro cliente (para probar own)', () => {
    expect(orders.filter((o) => o.customerId === IDS.customerUser).length).toBeGreaterThanOrEqual(1);
    expect(orders.filter((o) => o.customerId !== IDS.customerUser).length).toBeGreaterThanOrEqual(1);
  });

  it('las órdenes referencian productos sembrados con su precio actual', () => {
    const byId = Object.fromEntries(Object.values(catalog).map(({ id, price }) => [id, price]));
    orders.forEach((order) => {
      order.items.forEach((item) => {
        expect(byId).toHaveProperty(String(item.productId));
        expect(item.unitPrice).toBe(byId[item.productId]);
      });
    });
  });

  it('el último estado del historial coincide con el estado de la orden', () => {
    orders.forEach((order) => {
      expect(order.statusHistory[order.statusHistory.length - 1].status).toBe(order.status);
    });
  });

  it('los _id son únicos', () => {
    const ids = [...customers, ...orders].map((doc) => doc._id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos los documentos pasan la validación de los modelos', async () => {
    for (const customer of customers) {
      await new Customer(customer).validate();
    }
    for (const order of orders) {
      const doc = new Order(order);
      await doc.validate();
      expect(doc.totals.total).toBeCloseTo(doc.totals.subtotal + doc.totals.shipping - doc.totals.discount);
      expect(doc.totals.total).toBeGreaterThan(0);
    }
  });
});

// Modelo simulado: guarda los documentos en memoria, como lo haría la base de datos
function mockModel() {
  const store = new Map();
  return {
    store,
    findById: jest.fn((id) => ({ lean: () => Promise.resolve(store.get(String(id)) || null) })),
    create: jest.fn(async (doc) => { store.set(String(doc._id), { ...doc }); return doc; }),
    updateOne: jest.fn(async (filter, changes) => { Object.assign(store.get(String(filter._id)), changes); })
  };
}

describe('seedSampleMongo', () => {
  const sample = buildSampleDocuments({ userIds, catalog });

  it('crea los clientes y las órdenes de ejemplo', async () => {
    const models = { Customer: mockModel(), Order: mockModel() };
    const result = await seedSampleMongo({ ...models, userIds, catalog });

    expect(result).toEqual({
      customers: { created: sample.customers.length, updated: 0 },
      orders: { created: sample.orders.length }
    });
    expect(models.Customer.store.size).toBe(sample.customers.length);
    expect(models.Order.store.size).toBe(sample.orders.length);
  });

  it('es idempotente: una segunda ejecución no crea ni duplica nada', async () => {
    const models = { Customer: mockModel(), Order: mockModel() };
    await seedSampleMongo({ ...models, userIds, catalog });
    const second = await seedSampleMongo({ ...models, userIds, catalog });

    expect(second).toEqual({ customers: { created: 0, updated: 0 }, orders: { created: 0 } });
    expect(models.Customer.create).toHaveBeenCalledTimes(sample.customers.length);
    expect(models.Order.create).toHaveBeenCalledTimes(sample.orders.length);
  });

  it('si cambia el id del usuario en PostgreSQL, vuelve a sincronizar el userId del cliente', async () => {
    const models = { Customer: mockModel(), Order: mockModel() };
    await seedSampleMongo({ ...models, userIds, catalog });
    const result = await seedSampleMongo({ ...models, userIds: { ...userIds, user: 99 }, catalog });

    expect(result.customers.updated).toBe(1);
    expect(models.Customer.store.get(IDS.customerUser).userId).toBe(99);
    expect(models.Customer.create).toHaveBeenCalledTimes(sample.customers.length);
  });
});