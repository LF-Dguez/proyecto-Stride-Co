// Pruebas (con mocks, sin bases de datos) del manejador de errores para rutas web:
// una ruta que no existe debe responder con errors/404.pug, no con el error.pug
// genérico de Express ni con el JSON de la API.
const request = require('supertest');
const app = require('../app');

describe('errores de vistas web (sección 4.2 del PDF)', () => {
  it('una ruta web inexistente responde 404 con la página traducida, en es y en', async () => {
    const es = await request(app).get('/no-existe').set('Accept-Language', 'es');
    const en = await request(app).get('/no-existe?lang=en');

    [es, en].forEach((res) => {
      expect(res.statusCode).toBe(404);
      expect(res.headers['content-type']).toMatch(/html/);
    });

    expect(es.text).toContain('Página no encontrada');
    expect(en.text).toContain('Page not found');
  });

  it('la página de error usa el layout de la tienda (encabezado y pie de Stride-Co)', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.text).toContain('STRIDE');
    expect(res.text).toContain('stride.css');
  });

  it('no muestra el stack del error al usuario', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.text).not.toContain('at Object');
    expect(res.text).not.toContain('.js:');
  });
});
