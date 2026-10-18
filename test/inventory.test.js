const request = require('supertest');
const { buildApp, users } = require('./helpers/rbacApp');

jest.mock('../models/relationals', () => {
  const { mockModel } = require('./helpers/sequelizeMocks');
  return { Inventory: mockModel(), ProductVariant: {} };
});
const { Inventory } = require('../models/relationals');
const { mockInstance, sequelizeError } = require('./helpers/sequelizeMocks');
const inventoryRouter = require('../routes/inventory');

const app = buildApp((a) => a.use('/api/inventory', inventoryRouter));

const registro = { id: 1, variant_id: 1, stock: 50 };

beforeEach(() => {
  jest.resetAllMocks();
});

describe('API de Inventory (MySQL con Sequelize)', () => {
  it('GET /api/inventory responde 200 con el inventario de la base de datos', async () => {
    Inventory.findAll.mockResolvedValue([registro]);
    const response = await request(app).get('/api/inventory').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual([registro]);
  });

  it('GET /api/inventory/:id responde 200 con el stock', async () => {
    Inventory.findByPk.mockResolvedValue(registro);
    const response = await request(app).get('/api/inventory/1').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.stock).toBe(50);
  });

  it('GET /api/inventory/:id responde 404 si no existe', async () => {
    Inventory.findByPk.mockResolvedValue(null);
    const response = await request(app).get('/api/inventory/999').set(users.admin);

    expect(response.statusCode).toBe(404);
  });

  it('POST /api/inventory crea el registro y responde 201', async () => {
    Inventory.create.mockImplementation(async (data) => ({ id: 3, ...data }));
    const response = await request(app).post('/api/inventory').set(users.admin).send({ variant_id: 2, stock: 51 });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.stock).toBe(51);
  });

  it('PUT /api/inventory/:id actualiza el stock y responde 200', async () => {
    const instancia = mockInstance(registro);
    Inventory.findByPk.mockResolvedValue(instancia);
    const response = await request(app).put('/api/inventory/1').set(users.sales).send({ stock: 40 });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.stock).toBe(40);
  });

  it('PUT /api/inventory/:id con stock negativo responde 400', async () => {
    const instancia = mockInstance(registro);
    instancia.update.mockRejectedValue(sequelizeError('SequelizeValidationError', {
      errors: [{ message: 'Validation min on stock failed' }]
    }));
    Inventory.findByPk.mockResolvedValue(instancia);
    const response = await request(app).put('/api/inventory/1').set(users.admin).send({ stock: -5 });

    expect(response.statusCode).toBe(400);
  });

  it('DELETE /api/inventory/:id elimina y responde 200', async () => {
    const instancia = mockInstance(registro);
    Inventory.findByPk.mockResolvedValue(instancia);
    const response = await request(app).delete('/api/inventory/1').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(instancia.destroy).toHaveBeenCalled();
  });
});
