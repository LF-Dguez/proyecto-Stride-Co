// F3: detalle de producto (pruebas con mocks del servicio, sin base de datos).
jest.mock('../services/product.service', () => ({
  CATEGORY_LABELS: { 10: 'Running', 20: 'Urbano' },
  getActiveById: jest.fn()
}));

const request = require('supertest');
const productService = require('../services/product.service');
const app = require('../app');

const variant = (overrides = {}) => ({
  id: 1, sku: 'SKU-1', color: 'Negro', size: '27', active: true,
  inventory: { stock: 5, reserved: 2 },
  ...overrides
});

const product = (overrides = {}) => ({
  id: 1,
  name: 'Tenis Runner Pro',
  brand: 'Stride',
  description: 'Un tenis ligero para correr todos los días.',
  price: 1299.99,
  category_id: 10,
  active: true,
  variants: [variant()],
  ...overrides
});

describe('F3: detalle de producto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    productService.getActiveById.mockResolvedValue(product());
  });

  it('GET /products/:id responde 200 con los datos del producto', async () => {
    const res = await request(app).get('/products/1');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Tenis Runner Pro');
    expect(res.text).toContain('$1,299.99');
    expect(res.text).toContain('Un tenis ligero para correr todos los días.');
  });

  it('GET /products/:id calcula disponible = stock - reserved por variante', async () => {
    const res = await request(app).get('/products/1');
    expect(res.text).toContain('Negro · 27 — 3 disponibles');
  });

  it('GET /products/:id deshabilita la variante sin stock disponible', async () => {
    productService.getActiveById.mockResolvedValue(
      product({ variants: [variant({ inventory: { stock: 2, reserved: 2 } })] })
    );
    const res = await request(app).get('/products/1');
    expect(res.text).toContain('disabled');
    expect(res.text).toContain('Agotado');
  });

  it('GET /products/:id sin variantes muestra el estado vacío, no un enlace roto', async () => {
    productService.getActiveById.mockResolvedValue(product({ variants: [] }));
    const res = await request(app).get('/products/1');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Sin variantes disponibles por ahora.');
  });

  it('GET /products/:id incluye el view-transition-name del escenario para el morph con el catálogo', async () => {
    const res = await request(app).get('/products/1');
    expect(res.text).toContain('view-transition-name:product-visual-1');
  });

  it('GET /products/:id responde 404 si el producto no existe o está inactivo', async () => {
    productService.getActiveById.mockResolvedValue(null);
    const res = await request(app).get('/products/999');
    expect(res.statusCode).toBe(404);
    expect(res.text).toContain('404');
  });

  it('GET /products/:id con un id no numérico responde 404 sin consultar el servicio', async () => {
    const res = await request(app).get('/products/abc');
    expect(res.statusCode).toBe(404);
    expect(productService.getActiveById).not.toHaveBeenCalled();
  });

  it('GET /products/:id traduce la página (es y en)', async () => {
    const es = await request(app).get('/products/1').set('Accept-Language', 'es');
    const en = await request(app).get('/products/1?lang=en');
    expect(es.text).toContain('Volver al catálogo');
    expect(en.text).toContain('Back to catalog');
  });

  it('GET /products/:id nunca contiene password_hash ni salt_key', async () => {
    const res = await request(app).get('/products/1');
    expect(res.text).not.toContain('password_hash');
    expect(res.text).not.toContain('salt_key');
  });
});
