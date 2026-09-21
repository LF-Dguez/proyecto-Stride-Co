const request = require('supertest');
const app = require('../app');

describe('Manejo de rutas inexistentes', () => {
  it('GET a una ruta inexistente debe responder 404', async () => {
    const response = await request(app).get('/api/ruta');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});