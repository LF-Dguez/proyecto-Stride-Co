const request = require('supertest');
const app = require('../app');

describe('GET /api/users', () => {
  it('debe responder con status 200 y una lista de usuarios', async () => {
    const response = await request(app).get('/api/users');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});

describe('Manejo de rutas inexistentes', () => {
  it('GET a una ruta inexistente debe responder 404', async () => {
    const response = await request(app).get('/api/ruta');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});