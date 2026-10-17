const request = require('supertest');
const { buildApp, users } = require('./helpers/rbacApp');

jest.mock('../controllers/inventoryController', () => ({
  getAll: (req, res) => res.status(200).json({ message: 'ok' }),
  getById: (req, res) => res.status(200).json({ message: 'ok' }),
  create: (req, res) => res.status(201).json({ message: 'ok' }),
  update: (req, res) => res.status(200).json({ message: 'ok' }),
  delete: (req, res) => res.status(200).json({ message: 'ok' })
}));

const inventoryRouter = require('../routes/inventory');

const app = buildApp((a) => a.use('/api/inventory', inventoryRouter));

describe('RBAC en /api/inventory', () => {
  it('ADMIN puede eliminar (200)', async () => {
    const res = await request(app).delete('/api/inventory/1').set(users.admin);
    expect(res.status).toBe(200);
  });

  it('SALES puede leer (200)', async () => {
    const res = await request(app).get('/api/inventory').set(users.sales);
    expect(res.status).toBe(200);
  });

  it('SALES puede actualizar (200)', async () => {
    const res = await request(app).put('/api/inventory/1').set(users.sales).send({ stock: 5 });
    expect(res.status).toBe(200);
  });

  it('SALES no puede crear (403)', async () => {
    const res = await request(app).post('/api/inventory').set(users.sales).send({ stock: 5 });
    expect(res.status).toBe(403);
  });

  it('SALES no puede eliminar (403)', async () => {
    const res = await request(app).delete('/api/inventory/1').set(users.sales);
    expect(res.status).toBe(403);
  });

  it('USER no puede leer inventario (403)', async () => {
    const res = await request(app).get('/api/inventory').set(users.user);
    expect(res.status).toBe(403);
  });

  it('sin usuario autenticado responde 401', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(401);
  });
});