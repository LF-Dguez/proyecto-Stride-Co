const request = require('supertest');
const { buildApp, users } = require('./helpers/rbacApp');

jest.mock('../models/relationals', () => {
  const { mockModel } = require('./helpers/sequelizeMocks');
  return { Product: mockModel(), ProductVariant: {}, Inventory: {} };
});
const { Product } = require('../models/relationals');
const { mockInstance, sequelizeError } = require('./helpers/sequelizeMocks');
const productsRouter = require('../routes/products');

const app = buildApp((a) => a.use('/api/products', productsRouter));

const producto = { id: 1, category_id: 10, name: 'Tenis Runner Pro', brand: 'Stride', price: '1299.99', active: true, variants: [] };

beforeEach(() => {
  jest.resetAllMocks();
});

describe('API de Products (MySQL con Sequelize)', () => {
  it('GET /api/products responde 200 con los productos de la base de datos', async () => {
    Product.findAll.mockResolvedValue([producto]);
    const response = await request(app).get('/api/products').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual([producto]);
    expect(Product.findAll).toHaveBeenCalledTimes(1);
  });

  it('GET /api/products/:id responde 200 con el producto y sus variantes', async () => {
    Product.findByPk.mockResolvedValue(producto);
    const response = await request(app).get('/api/products/1').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.id).toBe(1);
    expect(response.body.data).toHaveProperty('variants');
    expect(Product.findByPk.mock.calls[0][0]).toBe(1);
  });

  it('GET /api/products/:id responde 404 si no existe', async () => {
    Product.findByPk.mockResolvedValue(null);
    const response = await request(app).get('/api/products/999').set(users.admin);

    expect(response.statusCode).toBe(404);
    expect(response.body.error.message).toBe('Producto no encontrado');
  });

  it('GET /api/products/abc responde 400 por ID inválido', async () => {
    const response = await request(app).get('/api/products/abc').set(users.admin);

    expect(response.statusCode).toBe(400);
    expect(Product.findByPk).not.toHaveBeenCalled();
  });

  it('POST /api/products crea el producto con solo los campos permitidos y responde 201', async () => {
    Product.create.mockImplementation(async (data) => ({ id: 3, ...data }));
    const nuevoProducto = { category_id: 10, name: 'Tenis Trail X', brand: 'Stride', price: 1599.99, id: 99 };
    const response = await request(app).post('/api/products').set(users.admin).send(nuevoProducto);

    expect(response.statusCode).toBe(201);
    expect(response.body.data.name).toBe('Tenis Trail X');
    expect(Product.create.mock.calls[0][0]).not.toHaveProperty('id');
  });

  it('POST /api/products con datos inválidos responde 400', async () => {
    Product.create.mockRejectedValue(sequelizeError('SequelizeValidationError', {
      errors: [{ message: 'Product.name cannot be null' }]
    }));
    const response = await request(app).post('/api/products').set(users.admin).send({ price: 10 });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.message).toBe('Product.name cannot be null');
  });

  it('PUT /api/products/:id actualiza y responde 200', async () => {
    const instancia = mockInstance(producto);
    Product.findByPk.mockResolvedValue(instancia);
    const response = await request(app).put('/api/products/1').set(users.admin).send({ name: 'Tenis Rail Z' });

    expect(response.statusCode).toBe(200);
    expect(instancia.update).toHaveBeenCalledWith({ name: 'Tenis Rail Z' });
    expect(response.body.data.name).toBe('Tenis Rail Z');
  });

  it('PUT /api/products/:id sin campos válidos responde 400', async () => {
    Product.findByPk.mockResolvedValue(mockInstance(producto));
    const response = await request(app).put('/api/products/1').set(users.admin).send({ id: 5 });

    expect(response.statusCode).toBe(400);
  });

  it('PUT /api/products/:id responde 404 si no existe', async () => {
    Product.findByPk.mockResolvedValue(null);
    const response = await request(app).put('/api/products/999').set(users.admin).send({ name: 'X' });

    expect(response.statusCode).toBe(404);
  });

  it('DELETE /api/products/:id elimina el registro y responde 200', async () => {
    const instancia = mockInstance(producto);
    Product.findByPk.mockResolvedValue(instancia);
    const response = await request(app).delete('/api/products/1').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(instancia.destroy).toHaveBeenCalled();
  });

  it('DELETE /api/products/:id responde 404 si no existe', async () => {
    Product.findByPk.mockResolvedValue(null);
    const response = await request(app).delete('/api/products/999').set(users.admin);

    expect(response.statusCode).toBe(404);
  });
});
