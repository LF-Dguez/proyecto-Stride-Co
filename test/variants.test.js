const request = require('supertest');
const { buildApp, users } = require('./helpers/rbacApp');

jest.mock('../models/relationals', () => {
  const { mockModel } = require('./helpers/sequelizeMocks');
  return { ProductVariant: mockModel(), Product: {}, Inventory: {} };
});
const { ProductVariant } = require('../models/relationals');
const { mockInstance, sequelizeError } = require('./helpers/sequelizeMocks');
const variantsRouter = require('../routes/variants');

const app = buildApp((a) => a.use('/api/variants', variantsRouter));

const variante = { id: 1, product_id: 1, sku: 'STR-RUN-BLK-27', color: 'Negro', size: '27', active: true };

beforeEach(() => {
  jest.resetAllMocks();
});

describe('API de Variants (MySQL con Sequelize)', () => {
  it('GET /api/variants responde 200 con las variantes de la base de datos', async () => {
    ProductVariant.findAll.mockResolvedValue([variante]);
    const response = await request(app).get('/api/variants').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual([variante]);
  });

  it('GET /api/variants/:id responde 200 con la variante', async () => {
    ProductVariant.findByPk.mockResolvedValue(variante);
    const response = await request(app).get('/api/variants/1').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.sku).toBe('STR-RUN-BLK-27');
  });

  it('GET /api/variants/:id responde 404 si no existe', async () => {
    ProductVariant.findByPk.mockResolvedValue(null);
    const response = await request(app).get('/api/variants/999').set(users.admin);

    expect(response.statusCode).toBe(404);
    expect(response.body.error.message).toBe('Variante no encontrada');
  });

  it('POST /api/variants crea la variante y responde 201', async () => {
    ProductVariant.create.mockImplementation(async (data) => ({ id: 3, ...data }));
    const nuevaVariante = { product_id: 2, sku: 'STR-RUN-PNK-26', color: 'Rosa', size: '26' };
    const response = await request(app).post('/api/variants').set(users.admin).send(nuevaVariante);

    expect(response.statusCode).toBe(201);
    expect(response.body.data.sku).toBe(nuevaVariante.sku);
  });

  it('POST /api/variants con un SKU repetido responde 409', async () => {
    ProductVariant.create.mockRejectedValue(sequelizeError('SequelizeUniqueConstraintError'));
    const response = await request(app).post('/api/variants').set(users.admin).send({ product_id: 1, sku: 'STR-RUN-BLK-27' });

    expect(response.statusCode).toBe(409);
  });

  it('POST /api/variants con un producto inexistente responde 400', async () => {
    ProductVariant.create.mockRejectedValue(sequelizeError('SequelizeForeignKeyConstraintError', {
      parent: { code: 'ER_NO_REFERENCED_ROW_2' }
    }));
    const response = await request(app).post('/api/variants').set(users.admin).send({ product_id: 999, sku: 'X' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.message).toBe('El registro relacionado no existe');
  });

  it('PUT /api/variants/:id actualiza y responde 200', async () => {
    const instancia = mockInstance(variante);
    ProductVariant.findByPk.mockResolvedValue(instancia);
    const response = await request(app).put('/api/variants/1').set(users.admin).send({ sku: 'STR-RUN-PNK-26' });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.sku).toBe('STR-RUN-PNK-26');
  });

  it('DELETE /api/variants/:id elimina y responde 200', async () => {
    const instancia = mockInstance(variante);
    ProductVariant.findByPk.mockResolvedValue(instancia);
    const response = await request(app).delete('/api/variants/1').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(instancia.destroy).toHaveBeenCalled();
  });

  it('DELETE /api/variants/:id con inventario asociado responde 409', async () => {
    const instancia = mockInstance(variante);
    instancia.destroy.mockRejectedValue(sequelizeError('SequelizeForeignKeyConstraintError', {
      parent: { code: 'ER_ROW_IS_REFERENCED_2' }
    }));
    ProductVariant.findByPk.mockResolvedValue(instancia);
    const response = await request(app).delete('/api/variants/1').set(users.admin);

    expect(response.statusCode).toBe(409);
  });
});
