// Prueba de integración del flujo completo (issue #75): login real -> JWT real
// -> authenticate llena req.user -> authorize decide con el rol real. Los modelos
// se simulan (no requiere MySQL), pero authenticate y authorize corren tal cual.
const request = require('supertest');

jest.mock('../models/relationals', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Product: { findAll: jest.fn(), findByPk: jest.fn() }
}));
const { User, Product } = require('../models/relationals');
const { hashPassword } = require('../services/password');
const { buildAccessControl, setAccessControl } = require('../services/rbac');
const { ROLE_PERMISSIONS } = require('../seeders/rbacMatrix');

const app = require('../app');

const ROLE_ID = { admin: 1, sales: 2 };

async function seedUser(role, overrides = {}) {
  const { password_hash, salt_key } = await hashPassword('Secret123');
  return {
    id: ROLE_ID[role],
    first_name: 'Prueba',
    last_name: role,
    email: `${role}@stride.co`,
    role_id: ROLE_ID[role],
    active: true,
    password_hash,
    salt_key,
    ...overrides,
    toJSON() {
      const { password_hash: _ph, salt_key: _sk, ...safe } = this; // eslint-disable-line no-unused-vars
      return safe;
    }
  };
}

async function login(user) {
  User.findOne.mockResolvedValue(user);
  const response = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Secret123' });
  return response.body.token;
}

beforeAll(() => {
  // Misma matriz que sembraría seedRbac.js, cargada en memoria (sin MySQL).
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 1: 'admin', 2: 'sales' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Flujo completo: login -> token -> recurso protegido', () => {
  it('ADMIN: login, luego GET /api/products con el token => 200', async () => {
    const admin = await seedUser('admin');
    const token = await login(admin);
    User.findByPk.mockResolvedValue(admin);

    Product.findAll.mockResolvedValue([]);
    const response = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Product.findAll).toHaveBeenCalled();
  });

  it('SALES: login, luego DELETE /api/products/:id (sin permiso) => 403', async () => {
    const sales = await seedUser('sales');
    const token = await login(sales);
    User.findByPk.mockResolvedValue(sales);

    const response = await request(app).delete('/api/products/1').set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(Product.findByPk).not.toHaveBeenCalled();
  });

  it('sin token => 401, nunca llega a authorize', async () => {
    const response = await request(app).get('/api/products');
    expect(response.statusCode).toBe(401);
    expect(User.findByPk).not.toHaveBeenCalled();
  });
});
