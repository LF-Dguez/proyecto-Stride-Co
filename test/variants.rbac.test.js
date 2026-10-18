const request = require('supertest');
const { buildApp, users } = require('./helpers/rbacApp');

jest.mock('../controllers/variantController', () => ({
  getAll: (req, res) => res.status(200).json({ message: 'ok' }),
  getById: (req, res) => res.status(200).json({ message: 'ok' }),
  create: (req, res) => res.status(201).json({ message: 'ok' }),
  update: (req, res) => res.status(200).json({ message: 'ok' }),
  delete: (req, res) => res.status(200).json({ message: 'ok' })
}));

const variantsRouter = require('../routes/variants');

const app = buildApp((a) => a.use('/api/variants', variantsRouter));

describe('RBAC en /api/variants', () => {
  it('ADMIN puede crear (201)', async () => {
    const res = await request(app).post('/api/variants').set(users.admin).send({ size: '27' });
    expect(res.status).toBe(201);
  });

  it('ADMIN puede eliminar (200)', async () => {
    const res = await request(app).delete('/api/variants/1').set(users.admin);
    expect(res.status).toBe(200);
  });

  it('SALES puede leer (200)', async () => {
    const res = await request(app).get('/api/variants').set(users.sales);
    expect(res.status).toBe(200);
  });

  it('SALES no puede crear (403)', async () => {
    const res = await request(app).post('/api/variants').set(users.sales).send({ size: '27' });
    expect(res.status).toBe(403);
  });

  it('SALES no puede eliminar (403)', async () => {
    const res = await request(app).delete('/api/variants/1').set(users.sales);
    expect(res.status).toBe(403);
  });

  it('USER puede leer (200)', async () => {
    const res = await request(app).get('/api/variants/1').set(users.user);
    expect(res.status).toBe(200);
  });

  it('USER no puede actualizar (403)', async () => {
    const res = await request(app).put('/api/variants/1').set(users.user).send({ size: '28' });
    expect(res.status).toBe(403);
  });

  it('sin usuario autenticado responde 401', async () => {
    const res = await request(app).get('/api/variants');
    expect(res.status).toBe(401);
  });
});