// Issue #100: errores globales (401, 403, 404, 500) y la vista de inicio
// responden en es y en, con la app real (login -> JWT real -> authenticate ->
// authorize), igual que test/auth.integration.test.js.
const request = require('supertest');

jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Product: { findAll: jest.fn(), findByPk: jest.fn() }
}));
const { User, Product } = require('../models/sql');
const { hashPassword } = require('../services/password');
const { buildAccessControl, setAccessControl } = require('../services/rbac');
const { ROLE_PERMISSIONS } = require('../seeders/rbacMatrix');

const app = require('../app');

const ROLE_ID = { admin: 1, sales: 2 };

async function seedUser(role) {
  const { password_hash, salt_key } = await hashPassword('Secret123');
  return {
    id: ROLE_ID[role], role_id: ROLE_ID[role], email: `${role}@stride.co`, active: true,
    password_hash, salt_key,
    toJSON() { return { id: this.id, email: this.email }; }
  };
}

async function login(user) {
  User.findOne.mockResolvedValue(user);
  const response = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Secret123' });
  return response.body.data.token;
}

beforeAll(() => {
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 1: 'admin', 2: 'sales' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('i18n en errores globales (issue #100)', () => {
  it('404, ruta inexistente: mismo mensaje, en es y en', async () => {
    const es = await request(app).get('/api/no-existe').set('Accept-Language', 'es');
    const en = await request(app).get('/api/no-existe?lang=en');

    expect(es.statusCode).toBe(404);
    expect(es.body.message).toBe('Ruta no encontrada');
    expect(en.body.message).toBe('Route not found');
  });

  it('401, sin token: mismo mensaje, en es y en', async () => {
    const es = await request(app).get('/api/products').set('Accept-Language', 'es');
    const en = await request(app).get('/api/products?lang=en');

    expect(es.statusCode).toBe(401);
    expect(es.body.message).toBe('No autenticado');
    expect(en.body.message).toBe('Not authenticated');
  });

  it('401, token inválido: mismo mensaje, en es y en (lo reporta express-jwt)', async () => {
    const es = await request(app).get('/api/products').set('Accept-Language', 'es').set('Authorization', 'Bearer token-invalido');
    const en = await request(app).get('/api/products?lang=en').set('Authorization', 'Bearer token-invalido');

    expect(es.statusCode).toBe(401);
    expect(es.body.message).toBe('No autenticado');
    expect(en.body.message).toBe('Not authenticated');
  });

  it('403, rol autenticado sin permiso: mismo mensaje, en es y en', async () => {
    const sales = await seedUser('sales');
    const token = await login(sales);
    User.findByPk.mockResolvedValue(sales);

    const es = await request(app).delete('/api/products/1').set('Accept-Language', 'es').set('Authorization', `Bearer ${token}`);
    const en = await request(app).delete('/api/products/1?lang=en').set('Authorization', `Bearer ${token}`);

    expect(es.statusCode).toBe(403);
    expect(es.body.message).toBe('Acceso denegado');
    expect(en.body.message).toBe('Access denied');
  });

  it('500, error inesperado: mismo mensaje, en es y en, sin exponer el detalle', async () => {
    const admin = await seedUser('admin');
    const token = await login(admin);
    User.findByPk.mockResolvedValue(admin);
    Product.findAll.mockRejectedValue(new Error('conexión perdida con la base de datos'));

    const es = await request(app).get('/api/products').set('Accept-Language', 'es').set('Authorization', `Bearer ${token}`);
    const en = await request(app).get('/api/products?lang=en').set('Authorization', `Bearer ${token}`);

    expect(es.statusCode).toBe(500);
    expect(es.body.message).toBe('Error interno del servidor');
    expect(en.body.message).toBe('Internal server error');
    expect(JSON.stringify(es.body)).not.toContain('conexión perdida');
  });

  it('GET / (vista Pug): el saludo sale traducido, en es y en', async () => {
    const es = await request(app).get('/').set('Accept-Language', 'es');
    const en = await request(app).get('/?lang=en');

    expect(es.text).toContain('Bienvenido a Express');
    expect(en.text).toContain('Welcome to Express');
  });
});
