const { api } = require('./helpers');

// Prueba de humo E2E: la API responde en /health sin autenticación
describe('GET /health (E2E)', () => {
  it('responde 200 con {"status":"UP"}', async () => {
    const response = await api().get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'UP' });
  });
});
