const request = require('supertest');
const app = require('../app');

describe('API de Orders', () => {

  it('GET /api/orders debe responder 200 con datos', async () => {
    const response = await request(app).get('/api/orders');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('GET /api/orders/:id debe responder 200 con la orden', async () => {
    const response = await request(app).get('/api/orders/1');
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('_id');
  });

  it('POST /api/orders debe crear una nueva orden y responder 201', async () => {
    const nuevaOrden = {
      paymentMethod: 'CARD',
      salesPersonId: 1
    };
    const response = await request(app)
      .post('/api/orders')
      .send(nuevaOrden);

    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty('_id');
    expect(response.body.data.salesPersonId).toBe(nuevaOrden.salesPersonId);
  });

  it('PUT /api/orders/:id debe actualizar y responder 200', async () => {
    const datosActualizados = { paymentMethod: 'CARD' };
    const response = await request(app)
      .put('/api/orders/1')
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.paymentMethod).toBe(datosActualizados.paymentMethod);
  });

  it('DELETE /api/orders/:id debe eliminar y responder 200', async () => {
    const response = await request(app).delete('/api/orders/1');
    expect(response.statusCode).toBe(200);
  });

});