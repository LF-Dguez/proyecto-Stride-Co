// F6: mis pedidos (pruebas con mocks del servicio, sin base de datos).
// Ejercita el alcance real de propiedad: Order.customerId -> Customer.userId
// comparado contra el usuario autenticado (services/ownership.js#orderOwner),
// igual que ya se probaba en test/orders.test.js para la API.
jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Product: { findAll: jest.fn() },
  ProductVariant: {},
  Inventory: {}
}));
jest.mock('../models/mongo/Customer', () => ({ findOne: jest.fn(), findById: jest.fn() }));
jest.mock('../models/mongo/Order', () => ({ find: jest.fn(), findById: jest.fn() }));

const request = require('supertest');
const { User, Product } = require('../models/sql');
const Customer = require('../models/mongo/Customer');
const Order = require('../models/mongo/Order');
const { hashPassword } = require('../services/password');
const { buildAccessControl, setAccessControl } = require('../services/rbac');
const { ROLE_PERMISSIONS } = require('../seeders/rbacMatrix');

const app = require('../app');

const ROLE_ID = { user: 3, otherUser: 4 };

function chainable(value) {
  const query = {
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    lean: jest.fn(() => Promise.resolve(value))
  };
  return query;
}

async function seedUser(role) {
  const { password_hash, salt_key } = await hashPassword('Secret123');
  const data = {
    id: ROLE_ID[role], first_name: 'Prueba', last_name: role, email: `${role}@stride.co`,
    role_id: ROLE_ID.user, active: true, password_hash, salt_key
  };
  return { ...data, toJSON() { const { password_hash: _ph, salt_key: _sk, ...safe } = this; return safe; } }; // eslint-disable-line no-unused-vars
}

async function loginAgent(role) {
  const user = await seedUser(role);
  User.findOne.mockResolvedValue(user);
  User.findByPk.mockResolvedValue(user);
  const agent = request.agent(app);
  await agent.post('/login').send({ email: user.email, password: 'Secret123' });
  return agent;
}

function fakeOrder(overrides = {}) {
  return {
    _id: '65b000000000000000000002',
    customerId: 'c00000000000000000000a1',
    status: 'PENDING',
    paymentMethod: 'CARD',
    items: [{ productId: 4, quantity: 1, unitPrice: 2199 }],
    shippingAddress: { street: 'Av. Universidad', city: 'Chihuahua' },
    statusHistory: [{ status: 'PENDING', changedAt: new Date(), note: 'Orden creada por el cliente' }],
    totals: { subtotal: 2199, shipping: 150, discount: 0, total: 2349 },
    createdAt: new Date(),
    ...overrides
  };
}

beforeAll(() => {
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 3: 'user', 4: 'user' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('F6: listado de mis pedidos', () => {
  it('sin sesión redirige a /login', async () => {
    const res = await request(app).get('/my/orders');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login?next=%2Fmy%2Forders');
  });

  it('sin un Customer ligado al usuario muestra el estado vacío, no un error', async () => {
    Customer.findOne.mockReturnValue(chainable(null));
    const agent = await loginAgent('user');
    const res = await agent.get('/my/orders');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Todavía no tienes pedidos.');
  });

  it('lista solo los pedidos del cliente ligado a este usuario', async () => {
    Customer.findOne.mockReturnValue(chainable({ _id: 'c00000000000000000000a1', userId: ROLE_ID.user }));
    Order.find.mockReturnValue(chainable([fakeOrder()]));
    const agent = await loginAgent('user');

    const res = await agent.get('/my/orders');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('$2,349.00');
    expect(Order.find).toHaveBeenCalledWith({ customerId: 'c00000000000000000000a1' });
  });
});

describe('F6: detalle de un pedido propio', () => {
  it('el dueño del pedido ve el detalle completo', async () => {
    Order.findById.mockReturnValue(chainable(fakeOrder()));
    Customer.findById.mockReturnValue(chainable({ _id: 'c00000000000000000000a1', userId: ROLE_ID.user }));
    Product.findAll.mockResolvedValue([{ id: 4, name: 'Bota Hiker' }]);

    const agent = await loginAgent('user');
    const res = await agent.get('/my/orders/65b000000000000000000002');

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Bota Hiker');
    expect(res.text).toContain('Av. Universidad');
  });

  it('otro usuario autenticado recibe 403, no puede ver el pedido de alguien más', async () => {
    Order.findById.mockReturnValue(chainable(fakeOrder()));
    Customer.findById.mockReturnValue(chainable({ _id: 'c00000000000000000000a1', userId: ROLE_ID.user }));

    const agent = await loginAgent('otherUser');
    const res = await agent.get('/my/orders/65b000000000000000000002');

    expect(res.statusCode).toBe(403);
  });

  it('un pedido inexistente responde 404', async () => {
    Order.findById.mockReturnValue(chainable(null));
    const agent = await loginAgent('user');
    const res = await agent.get('/my/orders/000000000000000000000000');
    expect(res.statusCode).toBe(404);
  });

  it('el HTML del detalle nunca contiene password_hash ni salt_key', async () => {
    Order.findById.mockReturnValue(chainable(fakeOrder()));
    Customer.findById.mockReturnValue(chainable({ _id: 'c00000000000000000000a1', userId: ROLE_ID.user }));
    Product.findAll.mockResolvedValue([{ id: 4, name: 'Bota Hiker' }]);

    const agent = await loginAgent('user');
    const res = await agent.get('/my/orders/65b000000000000000000002');
    expect(res.text).not.toContain('password_hash');
    expect(res.text).not.toContain('salt_key');
  });
});
