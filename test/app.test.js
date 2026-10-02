const request = require('supertest');
const app = require('../app');

describe('Manejo de rutas inexistentes', () => {
  it('GET a una ruta inexistente debe responder 404', async () => {
    const response = await request(app).get('/api/ruta');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /health', () => {
  it('debe responder 200 con status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'UP' });
  });
});

