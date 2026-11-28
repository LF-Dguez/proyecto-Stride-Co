// F9: administración de variantes (listar, crear, editar) con RBAC real.
const request = require('supertest');

jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Product: { findAll: jest.fn().mockResolvedValue([]) },
  ProductVariant: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Inventory: { create: jest.fn().mockResolvedValue({}), sum: jest.fn().mockResolvedValue(0) }
}));
jest.mock('../models/mongo', () => ({ Order: { countDocuments: jest.fn().mockResolvedValue(0) }, Customer: {} }));
jest.mock('../services/order.service', () => ({
  STATUSES: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  listRecent: jest.fn().mockResolvedValue([])
}));

const { User, ProductVariant } = require('../models/sql');
const { hashPassword } = require('../services/password');
const { buildAccessControl, setAccessControl } = require('../services/rbac');
const { ROLE_PERMISSIONS } = require('../seeders/rbacMatrix');

const app = require('../app');

const ROLE_ID = { admin: 1, sales: 2 };

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
    id: 1, sku: 'SKU-RUN-NEG-27', product_id: 1, color: 'Negro', size: '27', active: true,
    product: { name: 'Tenis Runner Pro' },
    inventory: { stock: 10, reserved: 2 },
    update: jest.fn(function update(fields) { Object.assign(this, fields); return Promise.resolve(this); }),
    ...overrides
  };
}

beforeAll(() => {
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 1: 'admin', 2: 'sales' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('F9: listado de variantes', () => {
  it('ADMIN ve la lista con el nombre del producto y lo disponible (stock - reserved)', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant()]);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/variants');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Tenis Runner Pro');
    expect(res.text).toContain('SKU-RUN-NEG-27');
    expect(res.text).toContain('>8<'); // 10 - 2
  });

  it('SALES ve la lista sin botón de nueva variante (solo lectura)', async () => {
    ProductVariant.findAll.mockResolvedValue([]);
    const agent = await loginAgent('sales');
    const res = await agent.get('/admin/variants');
    expect(res.statusCode).toBe(200);
    expect(res.text).not.toContain('Nueva variante');
  });

  it('SALES no puede crear (403)', async () => {
    const agent = await loginAgent('sales');
    const res = await agent.get('/admin/variants/new');
    expect(res.statusCode).toBe(403);
  });
});

describe('F9: crear y editar variante', () => {
  it('POST /admin/variants sin SKU ni color ni talla responde 400', async () => {
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/variants').send({ product_id: '1' });
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('El SKU es obligatorio');
    expect(ProductVariant.create).not.toHaveBeenCalled();
  });

  it('POST /admin/variants válido crea la variante y su inventario en 0/0', async () => {
    ProductVariant.create.mockResolvedValue(fakeVariant());
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/variants').send({ product_id: '1', sku: 'SKU-NEW-1', color: 'Azul', size: '26' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/admin/variants');
    expect(ProductVariant.create).toHaveBeenCalledWith(expect.objectContaining({ sku: 'SKU-NEW-1' }));
  });

  it('SKU repetido responde 400 con el mismo formulario (no 500)', async () => {
    const dupError = new Error('duplicate');
    dupError.name = 'SequelizeUniqueConstraintError';
    ProductVariant.create.mockRejectedValue(dupError);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/variants').send({ product_id: '1', sku: 'SKU-DUP', color: 'Azul', size: '26' });
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('El registro ya existe');
  });

  it('GET /admin/variants/:id/edit con id inexistente responde 404', async () => {
    ProductVariant.findByPk.mockResolvedValue(null);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/variants/999/edit');
    expect(res.statusCode).toBe(404);
  });

  it('POST /admin/variants/:id actualiza y redirige', async () => {
    const variant = fakeVariant();
    ProductVariant.findByPk.mockResolvedValue(variant);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/variants/1').send({ product_id: '1', sku: 'SKU-RUN-NEG-27', color: 'Negro', size: '28' });
    expect(res.statusCode).toBe(302);
    expect(variant.update).toHaveBeenCalledWith(expect.objectContaining({ size: '28' }));
  });
});
