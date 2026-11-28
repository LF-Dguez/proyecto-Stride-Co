// F5: checkout y confirmación (pruebas con mocks del servicio, sin base de datos).
jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Product: {},
  ProductVariant: { findAll: jest.fn() },
  Inventory: { findOne: jest.fn() }
}));
jest.mock('../models/mongo/Customer', () => ({ findOne: jest.fn(), create: jest.fn() }));
jest.mock('../models/mongo/Order', () => ({ create: jest.fn() }));

const request = require('supertest');
const { User, ProductVariant, Inventory } = require('../models/sql');
const Customer = require('../models/mongo/Customer');
const Order = require('../models/mongo/Order');
const { hashPassword } = require('../services/password');
const { buildAccessControl, setAccessControl } = require('../services/rbac');
const { ROLE_PERMISSIONS } = require('../seeders/rbacMatrix');

const app = require('../app');

const ROLE_ID = { user: 3 };

async function seedUser(role) {
  const { password_hash, salt_key } = await hashPassword('Secret123');
  const data = {
    id: ROLE_ID[role], first_name: 'Prueba', last_name: role, email: `${role}@stride.co`,
    role_id: ROLE_ID[role], active: true, password_hash, salt_key
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

function fakeVariant(overrides = {}) {
  return {
    id: 1,
    active: true,
    color: 'Negro',
    size: '27',
    product: { id: 10, name: 'Tenis Runner Pro', price: 1299.99, active: true },
    inventory: { stock: 5, reserved: 2 },
    ...overrides
  };
}

beforeAll(() => {
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 3: 'user' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('F5: acceso al checkout', () => {
  it('GET /checkout sin sesión redirige a /login conservando a dónde iba', async () => {
    const res = await request(app).get('/checkout');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login?next=%2Fcheckout');
  });

  it('GET /checkout con la bolsa vacía redirige a /cart', async () => {
    const agent = await loginAgent('user');
    const res = await agent.get('/checkout');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/cart');
  });

  it('GET /checkout con artículos en la bolsa muestra el resumen del pedido', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant()]);
    const agent = await loginAgent('user');
    await agent.post('/cart/items').send({ variantId: '1', quantity: '1' });

    const res = await agent.get('/checkout');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Tenis Runner Pro');
    expect(res.text).toContain('$1,449.99'); // 1299.99 + envío 150
  });
});

describe('F5: validación y creación del pedido', () => {
  it('POST /checkout con campos obligatorios faltantes responde 400 y conserva los valores capturados', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant()]);
    const agent = await loginAgent('user');
    await agent.post('/cart/items').send({ variantId: '1', quantity: '1' });

    const res = await agent.post('/checkout').send({ city: 'Chihuahua' });

    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('Chihuahua');
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('POST /checkout sin existencias suficientes responde 400 sin crear el pedido', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant({ inventory: { stock: 0, reserved: 0 } })]);
    const agent = await loginAgent('user');
    await agent.post('/cart/items').send({ variantId: '1', quantity: '1' });

    const res = await agent.post('/checkout').send({
      street: 'Av. Universidad', city: 'Chihuahua', paymentMethod: 'CARD'
    });

    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('ya no tiene existencias suficientes');
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('POST /checkout exitoso reserva el inventario, crea el pedido y limpia la bolsa', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant()]);
    const inv = { reserved: 2, update: jest.fn().mockResolvedValue(true) };
    Inventory.findOne.mockResolvedValue(inv);
    Customer.findOne.mockResolvedValue(null);
    Customer.create.mockResolvedValue({ _id: 'c1', addresses: [] });
    Order.create.mockResolvedValue({ _id: '65b000000000000000000099' });

    const agent = await loginAgent('user');
    await agent.post('/cart/items').send({ variantId: '1', quantity: '1' });

    const res = await agent.post('/checkout').send({
      street: 'Av. Universidad', city: 'Chihuahua', paymentMethod: 'CARD'
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/my/orders/65b000000000000000000099/confirmation');
    expect(inv.update).toHaveBeenCalledWith({ reserved: 3 });
    expect(Order.create).toHaveBeenCalledWith(expect.objectContaining({
      status: 'PENDING',
      paymentMethod: 'CARD',
      items: [{ productId: 10, quantity: 1, unitPrice: 1299.99 }]
    }));

    const clearedCookie = res.headers['set-cookie'].find((c) => c.startsWith('cart='));
    expect(clearedCookie).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('POST /checkout nunca contiene password_hash ni salt_key en la respuesta de error', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant()]);
    const agent = await loginAgent('user');
    await agent.post('/cart/items').send({ variantId: '1', quantity: '1' });

    const res = await agent.post('/checkout').send({ city: 'Chihuahua' });
    expect(res.text).not.toContain('password_hash');
    expect(res.text).not.toContain('salt_key');
  });
});
