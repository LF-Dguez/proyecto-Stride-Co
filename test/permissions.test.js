const request = require('supertest');
const app = require('../app');

describe('API de Permissions', () => {

  it('GET /api/permissions debe responder 200 con datos', async () => {
    const response = await request(app).get('/api/permissions');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('GET /api/permissions/:id debe responder 200 con un permiso', async () => {
    const response = await request(app).get('/api/permissions/1');
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('id');
  });

  it('POST /api/permissions debe crear un permiso y responder 201', async () => {
    const nuevoPermiso = {
      key: 'ORDERS_READ',
      description: 'Permite consultar pedidos'
    };
    const response = await request(app)
      .post('/api/permissions')
      .send(nuevoPermiso);

    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.key).toBe(nuevoPermiso.key);
  });

  it('PUT /api/permissions/:id debe actualizar y responder 200', async () => {
    const datosActualizados = { description: 'Permite consultar y exportar usuarios' };
    const response = await request(app)
      .put('/api/permissions/1')
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.description).toBe(datosActualizados.description);
  });

  it('DELETE /api/permissions/:id debe eliminar y responder 200', async () => {
    const response = await request(app).delete('/api/permissions/1');
    expect(response.statusCode).toBe(200);
  });

  it('GET a una subruta inexistente de /api/permissions debe responder 404', async () => {
    const response = await request(app).get('/api/permissions/1/inexistente');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

});
