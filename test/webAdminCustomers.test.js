// F12: clientes (listar, ver detalle con sus pedidos) con RBAC real.
const request = require('supertest');

jest.mock('../models/sql', () => ({ User: { findOne: jest.fn(), findByPk: jest.fn() } }));
jest.mock('../models/mongo', () => ({
  Order: { countDocuments: jest.fn().mockResolvedValue(0), find: jest.fn() },
  Customer: { find: jest.fn(), findById: jest.fn() }
}));
jest.mock('../services/order.service', () => ({
  STATUSES: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  listRecent: jest.fn().mockResolvedValue([])
}));

const { User } = require('../models/sql');
const { Order, Customer } = require('../models/mongo');
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

function mockLean(value) {
  const chain = { sort: jest.fn(() => chain), lean: () => Promise.resolve(value) };
  return chain;
}

beforeAll(() => {
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 1: 'admin', 3: 'user' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('F12: clientes', () => {
  it('ADMIN ve el listado de clientes', async () => {
    Customer.find.mockReturnValue(mockLean([{ _id: 'c1', email: 'ana@stride.co', phone: '555', addresses: [] }]));
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/customers');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('ana@stride.co');
  });

  it('USER (cliente) no puede ver el panel de clientes (403)', async () => {
    const agent = await loginAgent('user');
    const res = await agent.get('/admin/customers');
    expect(res.statusCode).toBe(403);
  });

  it('detalle muestra direcciones y los pedidos del cliente', async () => {
    Customer.findById.mockReturnValue({ lean: () => Promise.resolve({ _id: 'c1', email: 'ana@stride.co', phone: '555', addresses: [{ type: 'SHIPPING', street: 'Av. Siempre Viva', city: 'Chihuahua' }] }) });
    Order.find.mockReturnValue(mockLean([{ _id: 'o1', status: 'PAID', totals: { total: 500 }, createdAt: new Date() }]));
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/customers/c1');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Av. Siempre Viva');
    expect(res.text).toContain('Pagado');
  });

  it('cliente inexistente responde 404', async () => {
    Customer.findById.mockReturnValue({ lean: () => Promise.resolve(null) });
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/customers/000000000000000000000000');
    expect(res.statusCode).toBe(404);
  });
});
