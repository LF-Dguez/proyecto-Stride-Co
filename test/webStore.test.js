// F2: inicio y catálogo (pruebas con mocks del servicio, sin base de datos).
jest.mock('../services/product.service', () => ({
  CATEGORY_LABELS: { 10: 'Running', 20: 'Urbano' },
  listFeatured: jest.fn(),
  listActive: jest.fn()
}));

const request = require('supertest');
const productService = require('../services/product.service');
const app = require('../app');

const product = (overrides = {}) => ({
  id: 1, name: 'Tenis Runner Pro', brand: 'Stride', price: 1299.99, category_id: 10, active: true, ...overrides
});

describe('F2: inicio y catálogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    productService.listFeatured.mockResolvedValue([product()]);
    productService.listActive.mockResolvedValue({ products: [product()], page: 1, pages: 1 });
  });

  it('GET / responde 200 con el nombre del producto destacado en el HTML', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Tenis Runner Pro');
  });

  it('GET / en es y en traduce el encabezado de destacados', async () => {
    const es = await request(app).get('/').set('Accept-Language', 'es');
    const en = await request(app).get('/?lang=en');
    expect(es.text).toContain('Destacados');
    expect(en.text).toContain('Featured');
  });

  it('GET / sin productos destacados muestra el estado vacío, no un enlace roto', async () => {
    productService.listFeatured.mockResolvedValue([]);
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('No se encontraron productos.');
    expect(res.text).not.toContain('id="heroProduct"');
  });

  it('GET / incluye los datos de todos los destacados en el HTML (SSR verificable)', async () => {
    productService.listFeatured.mockResolvedValue([
      product({ id: 1, name: 'Tenis Runner Pro' }),
      product({ id: 2, name: 'Tenis Trail X', category_id: 20 })
    ]);
    const res = await request(app).get('/');
    const match = res.text.match(/<script type="application\/json" id="heroData">([^<]*)<\/script>/);
    expect(match).not.toBeNull();
    const embedded = JSON.parse(match[1]);
    expect(embedded.map((p) => p.name)).toEqual(['Tenis Runner Pro', 'Tenis Trail X']);
  });

  it('GET / con un solo destacado no incluye el script de rotación (nada que rotar)', async () => {
    const res = await request(app).get('/');
    expect(res.text).not.toContain('heroRotator.js');
  });

  it('GET / con varios destacados sí carga el script de rotación', async () => {
    productService.listFeatured.mockResolvedValue([product({ id: 1 }), product({ id: 2 })]);
    const res = await request(app).get('/');
    expect(res.text).toContain('/js/heroRotator.js');
  });

  it('GET /products responde 200 con el catálogo', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Tenis Runner Pro');
    expect(res.text).toContain('$1,299.99');
  });

  it('GET /products pasa q, category y page al servicio', async () => {
    await request(app).get('/products?q=runner&category=10&page=2');
    expect(productService.listActive).toHaveBeenCalledWith({ q: 'runner', category: '10', page: '2' });
  });

  it('GET /products conserva la búsqueda escrita en el campo', async () => {
    const res = await request(app).get('/products?q=runner');
    expect(res.text).toContain('value="runner"');
  });

  it('GET /products sin resultados muestra el mensaje traducido (es y en)', async () => {
    productService.listActive.mockResolvedValue({ products: [], page: 1, pages: 1 });
    const es = await request(app).get('/products?q=nada').set('Accept-Language', 'es');
    const en = await request(app).get('/products?q=nada&lang=en');
    expect(es.text).toContain('No se encontraron productos.');
    expect(en.text).toContain('No products found.');
  });

  it('GET /products con más de una página muestra la paginación con el filtro conservado', async () => {
    productService.listActive.mockResolvedValue({ products: [product()], page: 1, pages: 3 });
    const res = await request(app).get('/products?category=10');
    expect(res.text).toContain('category=10&amp;page=2');
  });

  it('GET /products con una sola página no muestra controles de paginación', async () => {
    const res = await request(app).get('/products');
    expect(res.text).not.toContain('class="pagination"');
  });

  it('el precio se formatea en es-MX y en en-US según el idioma', async () => {
    const es = await request(app).get('/products').set('Accept-Language', 'es');
    const en = await request(app).get('/products?lang=en');
    expect(es.text).toContain('$1,299.99');
    expect(en.text).toContain('MX$1,299.99');
  });

  it('el HTML nunca contiene password_hash ni salt_key', async () => {
    const res = await request(app).get('/products');
    expect(res.text).not.toContain('password_hash');
    expect(res.text).not.toContain('salt_key');
  });
});
