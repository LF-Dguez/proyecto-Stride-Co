// Sección 4.10: el idioma también se detecta desde una cookie, para que la elección
// hecha con el selector ES/EN del layout se conserve al navegar sin repetir ?lang= en
// cada enlace (config/i18n.js).
jest.mock('../services/product.service', () => ({
  CATEGORY_LABELS: { 10: 'Running' },
  listFeatured: jest.fn().mockResolvedValue([]),
  listActive: jest.fn().mockResolvedValue({ products: [], page: 1, pages: 1 })
}));

const request = require('supertest');
const app = require('../app');

describe('F2.10: cookie de idioma', () => {
  it('?lang=en guarda una cookie de idioma', async () => {
    const res = await request(app).get('/?lang=en');
    expect(res.statusCode).toBe(200);
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('lang='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/^lang=en/);
  });

  it('sin ?lang=, la cookie conserva el idioma elegido al navegar', async () => {
    const agent = request.agent(app);
    await agent.get('/?lang=en');

    const res = await agent.get('/products');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('All products');
  });

  it('?lang= en una petición siempre gana sobre la cookie existente', async () => {
    const agent = request.agent(app);
    await agent.get('/?lang=en');

    const res = await agent.get('/products?lang=es');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Todos los productos');
  });

  it('el layout de la tienda incluye el selector de idioma (ES / EN)', async () => {
    const res = await request(app).get('/');
    expect(res.text).toContain('>ES<');
    expect(res.text).toContain('>EN<');
  });
});
