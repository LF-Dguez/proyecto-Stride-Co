const es = require('../../locales/es.json');
const en = require('../../locales/en.json');
const { api, authHeader } = require('./helpers');

// La misma petición responde en español o en inglés. Los textos esperados se leen de
// locales/*.json, no se escriben a mano. Orden de detección: ?lang -> Accept-Language -> es.
// Esta suite no crea datos.
describe('Internacionalización (E2E)', () => {
  const MISSING_PRODUCT = '/api/products/999999';
  let adminHeaders;
  let salesHeaders;

  // Toda respuesta de la API tiene la forma { message, data }
  function expectEnvelope(res, status, message) {
    expect(res.statusCode).toBe(status);
    expect(res.body).toHaveProperty('data');
    expect(res.body.message).toBe(message);
  }

  beforeAll(async () => {
    adminHeaders = await authHeader('admin');
    salesHeaders = await authHeader('sales');
  });

  describe('selección del idioma', () => {
    it('Accept-Language: es y en traducen el mismo 404', async () => {
      const resEs = await api().get(MISSING_PRODUCT).set(adminHeaders).set('Accept-Language', 'es');
      expectEnvelope(resEs, 404, es.products.notFound);

      const resEn = await api().get(MISSING_PRODUCT).set(adminHeaders).set('Accept-Language', 'en');
      expectEnvelope(resEn, 404, en.products.notFound);
    });

    it('?lang=es y ?lang=en dan lo mismo que la cabecera', async () => {
      const resEs = await api().get(`${MISSING_PRODUCT}?lang=es`).set(adminHeaders);
      expectEnvelope(resEs, 404, es.products.notFound);

      const resEn = await api().get(`${MISSING_PRODUCT}?lang=en`).set(adminHeaders);
      expectEnvelope(resEn, 404, en.products.notFound);
    });

    it('?lang tiene prioridad sobre Accept-Language', async () => {
      const toEn = await api().get(`${MISSING_PRODUCT}?lang=en`).set(adminHeaders).set('Accept-Language', 'es');
      expectEnvelope(toEn, 404, en.products.notFound);

      const toEs = await api().get(`${MISSING_PRODUCT}?lang=es`).set(adminHeaders).set('Accept-Language', 'en');
      expectEnvelope(toEs, 404, es.products.notFound);
    });

    it('una variante regional se resuelve a su idioma base (es-MX -> es, en-US -> en)', async () => {
      const resMx = await api().get(MISSING_PRODUCT).set(adminHeaders).set('Accept-Language', 'es-MX');
      expectEnvelope(resMx, 404, es.products.notFound);

      const resUs = await api().get(MISSING_PRODUCT).set(adminHeaders).set('Accept-Language', 'en-US');
      expectEnvelope(resUs, 404, en.products.notFound);
    });

    it('un idioma no soportado responde en el idioma por defecto (es)', async () => {
      const byHeader = await api().get(MISSING_PRODUCT).set(adminHeaders).set('Accept-Language', 'fr');
      expectEnvelope(byHeader, 404, es.products.notFound);

      const byQuery = await api().get(`${MISSING_PRODUCT}?lang=fr`).set(adminHeaders);
      expectEnvelope(byQuery, 404, es.products.notFound);
    });
  });

  describe('errores transversales traducidos', () => {
    it.each([
      ['es', es],
      ['en', en]
    ])('401 sin token (%s)', async (lang, texts) => {
      const res = await api().get('/api/products').set('Accept-Language', lang);
      expectEnvelope(res, 401, texts.common.unauthenticated);
      expect(res.body.data).toBeNull();
    });

    it.each([
      ['es', es],
      ['en', en]
    ])('404 de una ruta inexistente bajo /api (%s)', async (lang, texts) => {
      const res = await api().get('/api/ruta-que-no-existe').set('Accept-Language', lang);
      expectEnvelope(res, 404, texts.common.routeNotFound);
      expect(res.body.data).toBeNull();
    });

    it.each([
      ['es', es],
      ['en', en]
    ])('403 de sales al eliminar un producto (%s)', async (lang, texts) => {
      const res = await api().delete(MISSING_PRODUCT).set(salesHeaders).set('Accept-Language', lang);
      expectEnvelope(res, 403, texts.common.forbidden);
      expect(res.body.data).toBeNull();
    });
  });

  describe('mensajes de éxito traducidos', () => {
    it.each([
      ['es', es],
      ['en', en]
    ])('GET /api/products con admin (%s)', async (lang, texts) => {
      const res = await api().get('/api/products').set(adminHeaders).set('Accept-Language', lang);
      expectEnvelope(res, 200, texts.products.listed);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
