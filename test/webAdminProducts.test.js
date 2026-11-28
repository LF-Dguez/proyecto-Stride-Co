// F8: administración de productos (crear, editar, activar/desactivar) con RBAC real.
const request = require('supertest');

jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Product: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  ProductVariant: { count: jest.fn().mockResolvedValue(0) },
  Inventory: { sum: jest.fn().mockResolvedValue(0) }
}));
jest.mock('../models/mongo', () => ({
  Order: { countDocuments: jest.fn().mockResolvedValue(0) },
  Customer: {}
}));
jest.mock('../services/order.service', () => ({
  STATUSES: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  listRecent: jest.fn().mockResolvedValue([])
}));

const { User, Product } = require('../models/sql');
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

function fakeProduct(overrides = {}) {
  return {
    id: 1, name: 'Tenis Runner Pro', brand: 'Stride', category_id: 10, price: '1299.99', active: true,
    update: jest.fn(function update(fields) { Object.assign(this, fields); return Promise.resolve(this); }),
    destroy: jest.fn().mockResolvedValue(),
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

describe('F8: listado de productos (RBAC)', () => {
  it('ADMIN ve el listado con botones de crear/editar', async () => {
    Product.findAndCountAll.mockResolvedValue({ rows: [fakeProduct()], count: 1 });
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/products');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Nuevo producto');
    expect(res.text).toContain('Tenis Runner Pro');
  });

  it('SALES ve el listado sin botones de crear/editar (solo lectura)', async () => {
    Product.findAndCountAll.mockResolvedValue({ rows: [fakeProduct()], count: 1 });
    const agent = await loginAgent('sales');
    const res = await agent.get('/admin/products');
    expect(res.statusCode).toBe(200);
    expect(res.text).not.toContain('Nuevo producto');
  });

  it('SALES no puede crear (403) aunque entre directo a la ruta', async () => {
    const agent = await loginAgent('sales');
    const res = await agent.get('/admin/products/new');
    expect(res.statusCode).toBe(403);
  });
});

describe('F8: crear producto (PRG)', () => {
  it('POST /admin/products sin nombre ni precio responde 400 con el mismo formulario', async () => {
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/products').send({ name: '', price: '' });
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('El nombre es obligatorio');
    expect(res.text).toContain('mayor o igual a 0');
    expect(Product.create).not.toHaveBeenCalled();
  });

  it('POST /admin/products con precio negativo responde 400', async () => {
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/products').send({ name: 'Tenis', price: '-5' });
    expect(res.statusCode).toBe(400);
    expect(Product.create).not.toHaveBeenCalled();
  });

  it('POST /admin/products válido crea el producto y redirige (302) con mensaje de confirmación', async () => {
    Product.create.mockResolvedValue(fakeProduct());
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/products').send({ name: 'Tenis Nuevo', brand: 'Stride', category_id: '10', price: '899.00' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/admin/products');
    expect(Product.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tenis Nuevo', price: '899.00' }));

    Product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const list = await agent.get(res.headers.location);
    expect(list.text).toContain('Producto creado');
  });
});

describe('F8: editar y activar/desactivar', () => {
  it('GET /admin/products/:id/edit con id inexistente responde 404', async () => {
    Product.findByPk.mockResolvedValue(null);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/products/999/edit');
    expect(res.statusCode).toBe(404);
  });

  it('POST /admin/products/:id con datos válidos actualiza y redirige', async () => {
    const product = fakeProduct();
    Product.findByPk.mockResolvedValue(product);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/products/1').send({ name: 'Tenis Actualizado', price: '1500' });
    expect(res.statusCode).toBe(302);
    expect(product.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tenis Actualizado' }));
  });

  it('POST /admin/products/:id/delete desactiva un producto activo', async () => {
    const product = fakeProduct({ active: true });
    Product.findByPk.mockResolvedValue(product);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/products/1/delete');
    expect(res.statusCode).toBe(302);
    expect(product.update).toHaveBeenCalledWith({ active: false });
  });

  it('SALES recibe 403 al intentar editar o desactivar', async () => {
    const agent = await loginAgent('sales');
    const edit = await agent.get('/admin/products/1/edit');
    const toggle = await agent.post('/admin/products/1/delete');
    expect(edit.statusCode).toBe(403);
    expect(toggle.statusCode).toBe(403);
  });
});

describe('F8: borrar producto (botón de bote de basura)', () => {
  it('POST /admin/products/:id/destroy borra y redirige con confirmación', async () => {
    const product = fakeProduct();
    Product.findByPk.mockResolvedValue(product);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/products/1/destroy');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/admin/products');
    expect(product.destroy).toHaveBeenCalled();
  });

  it('si tiene variantes relacionadas, no rompe: redirige con un mensaje en vez de 500', async () => {
    const fkError = new Error('still referenced from table "product_variants"');
    fkError.name = 'SequelizeForeignKeyConstraintError';
    fkError.parent = { detail: 'Key (id)=(1) is still referenced from table "product_variants".' };
    const product = fakeProduct({ destroy: jest.fn().mockRejectedValue(fkError) });
    Product.findByPk.mockResolvedValue(product);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/products/1/destroy');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/admin/products');
  });

  it('SALES no puede borrar (403)', async () => {
    const agent = await loginAgent('sales');
    const res = await agent.post('/admin/products/1/destroy');
    expect(res.statusCode).toBe(403);
  });
});
