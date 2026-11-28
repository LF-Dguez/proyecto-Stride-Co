// F4: bolsa de compra (pruebas con mocks del servicio, sin base de datos).
jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Product: {},
  ProductVariant: { findAll: jest.fn() },
  Inventory: {}
}));

const request = require('supertest');
const { ProductVariant } = require('../models/sql');
const app = require('../app');

function fakeVariant(overrides = {}) {
  return {
    id: 1,
    active: true,
    color: 'Negro',
    size: '27',
    product: { id: 10, name: 'Tenis Runner Pro', price: 1299.99, active: true },
    inventory: { stock: 5, reserved: 2 },
    ...overrides
  };
}

describe('F4: bolsa de compra', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /cart sin cookie muestra el estado vacío, no un enlace roto', async () => {
    const res = await request(app).get('/cart');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Tu bolsa está vacía.');
  });

  it('POST /cart/items agrega la variante y redirige a /cart por default', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/cart/items').send({ variantId: '1', quantity: '2' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/cart');
  });

  it('POST /cart/items respeta el next cuando es una ruta relativa', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/cart/items').send({ variantId: '1', next: '/products/10' });
    expect(res.headers.location).toBe('/products/10');
  });

  it('POST /cart/items ignora un next absoluto (open redirect) y usa /cart', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/cart/items').send({ variantId: '1', next: 'https://evil.com' });
    expect(res.headers.location).toBe('/cart');
  });

  it('POST /cart/items con variantId no numérico responde 400 sin tocar la cookie', async () => {
    const res = await request(app).post('/cart/items').send({ variantId: 'abc' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /cart resuelve la bolsa contra la base de datos: nombre, precio y total actuales', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant()]);
    const agent = request.agent(app);
    await agent.post('/cart/items').send({ variantId: '1', quantity: '2' });

    const res = await agent.get('/cart');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Tenis Runner Pro');
    expect(res.text).toContain('$2,599.98');
  });

  it('una variante inactiva o borrada se marca como no disponible, no se elimina sola', async () => {
    ProductVariant.findAll.mockResolvedValue([]);
    const agent = request.agent(app);
    await agent.post('/cart/items').send({ variantId: '1', quantity: '1' });

    const res = await agent.get('/cart');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Este producto ya no está disponible.');
  });

  it('POST /cart/items/:variantId actualiza la cantidad', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant()]);
    const agent = request.agent(app);
    await agent.post('/cart/items').send({ variantId: '1', quantity: '1' });
    await agent.post('/cart/items/1').send({ quantity: '3' });

    const res = await agent.get('/cart');
    expect(res.text).toContain('$3,899.97');
  });

  it('POST /cart/items/:variantId con cantidad 0 quita la línea de la bolsa', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant()]);
    const agent = request.agent(app);
    await agent.post('/cart/items').send({ variantId: '1', quantity: '1' });
    await agent.post('/cart/items/1').send({ quantity: '0' });

    const res = await agent.get('/cart');
    expect(res.text).toContain('Tu bolsa está vacía.');
  });

  it('POST /cart/items/:variantId/delete quita la línea de la bolsa', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant()]);
    const agent = request.agent(app);
    await agent.post('/cart/items').send({ variantId: '1', quantity: '1' });
    await agent.post('/cart/items/1/delete');

    const res = await agent.get('/cart');
    expect(res.text).toContain('Tu bolsa está vacía.');
  });

  it('GET /cart nunca contiene password_hash ni salt_key', async () => {
    ProductVariant.findAll.mockResolvedValue([fakeVariant()]);
    const agent = request.agent(app);
    await agent.post('/cart/items').send({ variantId: '1', quantity: '1' });

    const res = await agent.get('/cart');
    expect(res.text).not.toContain('password_hash');
    expect(res.text).not.toContain('salt_key');
  });
});
