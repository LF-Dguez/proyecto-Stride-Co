// Issue #98: products, variants e inventory responden en es y en, por ?lang=
// y por Accept-Language, con la misma petición.
const request = require('supertest');

jest.mock('../models/sql', () => {
  const { mockModel } = require('./helpers/sequelizeMocks');
  return { Product: mockModel(), ProductVariant: mockModel(), Inventory: mockModel() };
});
const { Product, ProductVariant, Inventory } = require('../models/sql');

const productsRouter = require('../routes/products');
const variantsRouter = require('../routes/variants');
const inventoryRouter = require('../routes/inventory');
const { buildApp, users } = require('./helpers/rbacApp');

const app = buildApp((a) => {
  a.use('/api/products', productsRouter);
  a.use('/api/variants', variantsRouter);
  a.use('/api/inventory', inventoryRouter);
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe('i18n en products, variants e inventory (issue #98)', () => {
  it('GET /api/products (200): mismo mensaje, en es y en', async () => {
    Product.findAll.mockResolvedValue([]);
    const es = await request(app).get('/api/products').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/products?lang=en').set(users.admin);

    expect(es.body.message).toBe('GET productos obtenido exitosamente');
    expect(en.body.message).toBe('GET products retrieved successfully');
  });

  it('GET /api/products/:id inexistente (404): mismo mensaje, en es y en', async () => {
    Product.findByPk.mockResolvedValue(null);
    const es = await request(app).get('/api/products/999').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/products/999?lang=en').set(users.admin);

    expect(es.body.message).toBe('Producto no encontrado');
    expect(en.body.message).toBe('Product not found');
  });

  it('GET /api/variants (200): mismo mensaje, en es y en', async () => {
    ProductVariant.findAll.mockResolvedValue([]);
    const es = await request(app).get('/api/variants').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/variants?lang=en').set(users.admin);

    expect(es.body.message).toBe('GET variantes obtenido exitosamente');
    expect(en.body.message).toBe('GET variants retrieved successfully');
  });

  it('GET /api/variants/:id inexistente (404): mismo mensaje, en es y en', async () => {
    ProductVariant.findByPk.mockResolvedValue(null);
    const es = await request(app).get('/api/variants/999').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/variants/999?lang=en').set(users.admin);

    expect(es.body.message).toBe('Variante no encontrada');
    expect(en.body.message).toBe('Variant not found');
  });

  it('GET /api/inventory (200): mismo mensaje, en es y en', async () => {
    Inventory.findAll.mockResolvedValue([]);
    const es = await request(app).get('/api/inventory').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/inventory?lang=en').set(users.admin);

    expect(es.body.message).toBe('GET inventario obtenido exitosamente');
    expect(en.body.message).toBe('GET inventory retrieved successfully');
  });

  it('GET /api/inventory/:id inexistente (404): mismo mensaje, en es y en', async () => {
    Inventory.findByPk.mockResolvedValue(null);
    const es = await request(app).get('/api/inventory/999').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/inventory/999?lang=en').set(users.admin);

    expect(es.body.message).toBe('Registro de inventario no encontrado');
    expect(en.body.message).toBe('Inventory record not found');
  });

  it('PUT /api/products/:id sin datos (400): mismo mensaje, en es y en', async () => {
    Product.findByPk.mockResolvedValue({ id: 1, update: jest.fn() });
    const es = await request(app).put('/api/products/1').set(users.admin).set('Accept-Language', 'es').send({});
    const en = await request(app).put('/api/products/1?lang=en').set(users.admin).send({});

    expect(es.body.message).toBe('No hay datos válidos para actualizar');
    expect(en.body.message).toBe('No valid data to update');
  });
});
