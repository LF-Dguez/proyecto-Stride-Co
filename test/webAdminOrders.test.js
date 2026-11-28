// F11: administración de pedidos (listar, filtrar por estado, cambiar estado) con RBAC real.
const request = require('supertest');

jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Product: {}, ProductVariant: {}, Inventory: {}
}));
jest.mock('../models/mongo', () => ({ Order: {}, Customer: {} }));
jest.mock('../services/order.service', () => ({
  STATUSES: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  listRecent: jest.fn().mockResolvedValue([]),
  listOrders: jest.fn(),
  getOrderDetail: jest.fn(),
  appendStatusChange: jest.fn()
}));

const { User } = require('../models/sql');
const orderService = require('../services/order.service');
const { hashPassword } = require('../services/password');
const { buildAccessControl, setAccessControl } = require('../services/rbac');
const { ROLE_PERMISSIONS } = require('../seeders/rbacMatrix');

const app = require('../app');

const ROLE_ID = { admin: 1, sales: 2, user: 3 };

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

function fakeOrder(overrides = {}) {
  return {
    _id: '65b000000000000000000002',
    customerId: { email: 'cliente@stride.co', phone: '6141234567', addresses: [] },
    status: 'PENDING',
    items: [{ productId: 4, quantity: 1, unitPrice: 2199, productName: 'Bota Hiker' }],
    shippingAddress: { street: 'Av. Universidad', city: 'Chihuahua' },
    statusHistory: [{ status: 'PENDING', changedAt: new Date(), note: 'Orden creada' }],
    totals: { subtotal: 2199, shipping: 150, discount: 0, total: 2349 },
    createdAt: new Date(),
    ...overrides
  };
}

beforeAll(() => {
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 1: 'admin', 2: 'sales', 3: 'user' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('F11: listado de pedidos', () => {
  it('ADMIN ve el listado con los pedidos y sus estados traducidos', async () => {
    orderService.listOrders.mockResolvedValue([fakeOrder()]);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/orders');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('cliente@stride.co');
    expect(res.text).toContain('Pendiente');
  });

  it('pasa el filtro status al servicio', async () => {
    orderService.listOrders.mockResolvedValue([]);
    const agent = await loginAgent('admin');
    await agent.get('/admin/orders?status=PAID');
    expect(orderService.listOrders).toHaveBeenCalledWith({ status: 'PAID' });
  });

  it('USER (cliente) recibe 403, no puede ver el panel de pedidos', async () => {
    const agent = await loginAgent('user');
    const res = await agent.get('/admin/orders');
    expect(res.statusCode).toBe(403);
  });

  it('sin pedidos muestra el estado vacío, no una lista rota', async () => {
    orderService.listOrders.mockResolvedValue([]);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/orders');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('No hay pedidos.');
  });
});

describe('F11: detalle y cambio de estado', () => {
  it('GET /admin/orders/:id con id inexistente responde 404', async () => {
    orderService.getOrderDetail.mockResolvedValue(null);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/orders/000000000000000000000000');
    expect(res.statusCode).toBe(404);
  });

  it('el detalle muestra cliente, artículos, totales e historial', async () => {
    orderService.getOrderDetail.mockResolvedValue(fakeOrder());
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/orders/65b000000000000000000002');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Bota Hiker');
    expect(res.text).toContain('$2,349.00');
    expect(res.text).toContain('Orden creada');
  });

  it('SALES sí puede cambiar el estado (orders:update:any)', async () => {
    orderService.appendStatusChange.mockResolvedValue(fakeOrder({ status: 'PAID' }));
    const agent = await loginAgent('sales');
    const res = await agent.post('/admin/orders/65b000000000000000000002/status').send({ status: 'PAID', note: 'Listo' });
    expect(res.statusCode).toBe(302);
    expect(orderService.appendStatusChange).toHaveBeenCalledWith(
      '65b000000000000000000002',
      expect.objectContaining({ status: 'PAID', note: 'Listo' })
    );
  });

  it('un estado inválido responde 400 sin tocar el servicio', async () => {
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/orders/65b000000000000000000002/status').send({ status: 'NO_EXISTE' });
    expect(res.statusCode).toBe(400);
    expect(orderService.appendStatusChange).not.toHaveBeenCalled();
  });

  it('USER no puede cambiar el estado (403)', async () => {
    const agent = await loginAgent('user');
    const res = await agent.post('/admin/orders/65b000000000000000000002/status').send({ status: 'PAID' });
    expect(res.statusCode).toBe(403);
  });

  it('el HTML del detalle nunca contiene password_hash ni salt_key', async () => {
    orderService.getOrderDetail.mockResolvedValue(fakeOrder());
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/orders/65b000000000000000000002');
    expect(res.text).not.toContain('password_hash');
    expect(res.text).not.toContain('salt_key');
  });
});
