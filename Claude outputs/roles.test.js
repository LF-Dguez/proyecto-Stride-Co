const request = require('supertest');
const app = require('../app');

describe('API de Roles', () => {

  it('GET /api/roles debe responder 200 con datos', async () => {
    const response = await request(app).get('/api/roles');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('GET /api/roles/:id debe responder 200 con un rol', async () => {
    const response = await request(app).get('/api/roles/1');
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('id');
  });

  it('POST /api/roles debe crear un rol y responder 201', async () => {
    const nuevoRol = {
      name: 'INVENTORY',
      description: 'Encargado de inventario'
    };
    const response = await request(app)
      .post('/api/roles')
      .send(nuevoRol);

    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.name).toBe(nuevoRol.name);
  });

  it('PUT /api/roles/:id debe actualizar y responder 200', async () => {
    const datosActualizados = { description: 'Administrador general' };
    const response = await request(app)
      .put('/api/roles/1')
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.description).toBe(datosActualizados.description);
  });

  it('DELETE /api/roles/:id debe eliminar y responder 200', async () => {
    const response = await request(app).delete('/api/roles/1');
    expect(response.statusCode).toBe(200);
  });

  it('GET a una subruta inexistente de /api/roles debe responder 404', async () => {
    const response = await request(app).get('/api/roles/1/inexistente');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

});
