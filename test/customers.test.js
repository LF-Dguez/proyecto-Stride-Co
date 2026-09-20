const request = require('supertest');
const app = require('../app');

describe('API de Customers', () => {

  it('GET /api/customers debe responder 200 con datos', async () => {
    const response = await request(app).get('/api/customers');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('GET /api/customers/:id debe responder 200 con un cliente', async () => {
    const response = await request(app).get('/api/customers/1');
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('_id');
  });

  it('POST /api/customers debe crear un cliente y responder 201', async () => {
    const nuevoCliente = {
      phone: '6141112233',
      email: 'nuevo@stride.com'
    };
    const response = await request(app)
      .post('/api/customers')
      .send(nuevoCliente);

    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty('_id');
    expect(response.body.data.email).toBe(nuevoCliente.email);
  });

  it('PUT /api/customers/:id debe actualizar y responder 200', async () => {
    const datosActualizados = { phone: '6149998877' };
    const response = await request(app)
      .put('/api/customers/1')
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.phone).toBe(datosActualizados.phone);
  });

  it('DELETE /api/customers/:id debe eliminar y responder 200', async () => {
    const response = await request(app).delete('/api/customers/1');
    expect(response.statusCode).toBe(200);
  });

});