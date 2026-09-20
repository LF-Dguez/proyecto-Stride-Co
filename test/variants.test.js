const request = require('supertest');
const app = require('../app');

describe('API de Variants', () => {

  it('GET /api/variants debe responder 200 con un arreglo de productos', async () => {
    const response = await request(app).get('/api/variants');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0]).toHaveProperty('sku');
  });

  it('GET /api/variants/:id debe responder 200 con la variante correcta', async () => {
    const response = await request(app).get('/api/variants/1');
    expect(response.statusCode).toBe(200);
    expect(response.body.data.id).toBe(1);
    expect(typeof response.body.data.sku).toBe('string');
  });

  it('POST /api/variants debe crear una variante y responder 201', async () => {
    const nuevaVariante = {
      product_id: 2,
      sku: 'STR-RUN-PNK-27',
      color: 'Rosa',
      size: 26
    };
    const response = await request(app)
      .post('/api/variants')
      .send(nuevaVariante);

    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty('product_id');
    expect(response.body.data.sku).toBe(nuevaVariante.sku);
  });

  it('PUT /api/variants/:id debe actualizar y responder 200', async () => {
    const datosActualizados = { sku: 'STR-RUN-PNK-26' };
    const response = await request(app)
      .put('/api/variants/1')
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.sku).toBe(datosActualizados.sku);
  });

  it('DELETE /api/variants/:id debe eliminar y responder 200', async () => {
    const response = await request(app).delete('/api/variants/1');
    expect(response.statusCode).toBe(200);
  });

});