const request = require('supertest');
const app = require('../app');

describe('API de Users', () => {

  it('GET /api/users debe responder 200 con datos', async () => {
    const response = await request(app).get('/api/users');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('GET /api/users/:id debe responder 200 con un usuario', async () => {
    const response = await request(app).get('/api/users/1');
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('id');
  });

  it('POST /api/users debe crear un usuario y responder 201', async () => {
    const nuevoUsuario = {
      first_name: 'Ana',
      last_name: 'Lopez',
      email: 'ana@stride.com',
      role_id: 2
    };
    const response = await request(app)
      .post('/api/users')
      .send(nuevoUsuario);

    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.email).toBe(nuevoUsuario.email);
  });

  it('PUT /api/users/:id debe actualizar y responder 200', async () => {
    const datosActualizados = { first_name: 'Carlos' };
    const response = await request(app)
      .put('/api/users/1')
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.first_name).toBe(datosActualizados.first_name);
  });

  it('DELETE /api/users/:id debe eliminar y responder 200', async () => {
    const response = await request(app).delete('/api/users/1');
    expect(response.statusCode).toBe(200);
  });

  it('GET a una subruta inexistente de /api/users debe responder 404', async () => {
    const response = await request(app).get('/api/users/1/inexistente');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

});
