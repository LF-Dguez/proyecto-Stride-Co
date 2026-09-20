const request = require('supertest');
const app = require('../app');

describe('GET /api/users', () => {
  it('debe responder con status 200 y una lista de usuarios', async () => {
    const response = await request(app).get('/api/users');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});