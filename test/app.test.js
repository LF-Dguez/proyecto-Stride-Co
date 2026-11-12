const request = require('supertest');
const app = require('../app');

describe('Manejo de rutas inexistentes', () => {
  it('GET a una ruta inexistente debe responder 404', async () => {
    const response = await request(app).get('/api/ruta');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('message');
  });
});

describe('GET /health', () => {
  it('debe responder 200 con status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'UP' });
  });
});


describe('Formato uniforme de los errores', () => {
  it('un error bajo /api responde { message, data } con el mensaje traducido', async () => {
    const es = await request(app).get('/api/no-existe?lang=es');
    const en = await request(app).get('/api/no-existe?lang=en');

    expect(es.statusCode).toBe(404);
    expect(es.body).toEqual({ message: 'Ruta no encontrada', data: null });
    expect(en.body).toEqual({ message: 'Route not found', data: null });
  });

  it('el 401 de express-jwt usa el mismo formato', async () => {
    const response = await request(app).get('/api/products').set('Authorization', 'Bearer abc.def.ghi');

    expect(response.statusCode).toBe(401);
    expect(Object.keys(response.body).sort()).toEqual(['data', 'message']);
    expect(response.body.data).toBeNull();
  });
});
