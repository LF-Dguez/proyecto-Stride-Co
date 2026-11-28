// F10: inventario (ajustar existencias y reservadas) con RBAC real.
const request = require('supertest');

jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Inventory: { findAll: jest.fn(), findOne: jest.fn() }
}));
jest.mock('../models/mongo', () => ({ Order: { countDocuments: jest.fn().mockResolvedValue(0) }, Customer: {} }));
jest.mock('../services/order.service', () => ({
  STATUSES: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  listRecent: jest.fn().mockResolvedValue([])
}));

const { User, Inventory } = require('../models/sql');
const { hashPassword } = require('../services/password');
const { buildAccessControl, setAccessControl } = require('../services/rbac');
const { ROLE_PERMISSIONS } = require('../seeders/rbacMatrix');

const app = require('../app');

const ROLE_ID = { admin: 1, user: 3 };

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

function fakeInventoryRow(overrides = {}) {
  return {
    variant_id: 1, stock: 10, reserved: 2,
    variant: { sku: 'SKU-1', color: 'Negro', size: '27', product: { name: 'Tenis Runner Pro' } },
    update: jest.fn(function update(fields) { Object.assign(this, fields); return Promise.resolve(this); }),
    ...overrides
  };
}

beforeAll(() => {
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 1: 'admin', 3: 'user' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('F10: listado de inventario', () => {
  it('ADMIN ve el inventario con lo disponible calculado (stock - reserved)', async () => {
    Inventory.findAll.mockResolvedValue([fakeInventoryRow()]);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/inventory');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('SKU-1');
    expect(res.text).toContain('>8<');
  });

  it('USER (cliente) no puede ver el inventario (403)', async () => {
    const agent = await loginAgent('user');
    const res = await agent.get('/admin/inventory');
    expect(res.statusCode).toBe(403);
  });
});

describe('F10: ajustar existencias y reservadas', () => {
  it('actualiza stock y reserved válidos y redirige', async () => {
    const row = fakeInventoryRow();
    Inventory.findOne.mockResolvedValue(row);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/inventory/1').send({ stock: '20', reserved: '5' });
    expect(res.statusCode).toBe(302);
    expect(row.update).toHaveBeenCalledWith({ stock: 20, reserved: 5 });
  });

  it('reserved mayor que stock no se aplica (regla de negocio del servidor)', async () => {
    const row = fakeInventoryRow();
    Inventory.findOne.mockResolvedValue(row);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/inventory/1').send({ stock: '5', reserved: '10' });
    expect(res.statusCode).toBe(302);
    expect(row.update).not.toHaveBeenCalled();
  });

  it('números negativos o no numéricos no se aplican', async () => {
    const row = fakeInventoryRow();
    Inventory.findOne.mockResolvedValue(row);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/inventory/1').send({ stock: '-1', reserved: 'abc' });
    expect(res.statusCode).toBe(302);
    expect(row.update).not.toHaveBeenCalled();
  });

  it('id de variante inexistente responde 404', async () => {
    Inventory.findOne.mockResolvedValue(null);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/inventory/999').send({ stock: '1', reserved: '0' });
    expect(res.statusCode).toBe(404);
  });
});
