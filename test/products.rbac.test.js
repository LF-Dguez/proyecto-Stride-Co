const request = require('supertest');
const { buildApp, users } = require('./helpers/rbacApp');

jest.mock('../controllers/productController', () => ({
  getAll: (req, res) => res.status(200).json({ message: 'ok' }),
  getById: (req, res) => res.status(200).json({ message: 'ok' }),
  create: (req, res) => res.status(201).json({ message: 'ok' }),
  update: (req, res) => res.status(200).json({ message: 'ok' }),
  delete: (req, res) => res.status(200).json({ message: 'ok' })
}));

const productsRouter = require('../routes/products');

const app = buildApp((a) => a.use('/api/products', productsRouter));

describe('RBAC en /api/products', () => {
  describe('ADMIN (permitido)', () => {
    test('GET /api/products -> 200', async () => {
      const res = await request(app).get('/api/products').set(users.admin);
      expect(res.status).toBe(200);
    });

    test('POST /api/products -> 201', async () => {
      const res = await request(app).post('/api/products').set(users.admin).send({ name: 'Tenis' });
      expect(res.status).toBe(201);
    });

    test('PUT /api/products/1 -> 200', async () => {
      const res = await request(app).put('/api/products/1').set(users.admin).send({ name: 'Tenis' });
      expect(res.status).toBe(200);
    });

    test('DELETE /api/products/1 -> 200', async () => {
      const res = await request(app).delete('/api/products/1').set(users.admin);
      expect(res.status).toBe(200);
    });
  });

  describe('SALES (denegado en escritura)', () => {
    test('DELETE /api/products/1 -> 403', async () => {
      const res = await request(app).delete('/api/products/1').set(users.sales);
      expect(res.status).toBe(403);
    });

    test('POST /api/products -> 403', async () => {
      const res = await request(app).post('/api/products').set(users.sales).send({ name: 'Tenis' });
      expect(res.status).toBe(403);
    });

    test('PUT /api/products/1 -> 403', async () => {
      const res = await request(app).put('/api/products/1').set(users.sales).send({ name: 'Tenis' });
      expect(res.status).toBe(403);
    });

    test('GET /api/products -> 200 (sales sí puede leer)', async () => {
      const res = await request(app).get('/api/products').set(users.sales);
      expect(res.status).toBe(200);
    });
  });

  describe('Sin usuario autenticado', () => {
    test('GET /api/products -> 401', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
    });
  });
});