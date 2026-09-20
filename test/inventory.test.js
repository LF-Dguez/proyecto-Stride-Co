const request = require('supertest');
const app = require('../app');

describe('API de Inventory', () => {

  it('GET /api/inventory debe responder 200 con un arreglo de productos', async () => {
    const response = await request(app).get('/api/inventory');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0]).toHaveProperty('id');
  });

  it('GET /api/inventory/:id debe responder 200 con el stock correcto', async () => {
    const response = await request(app).get('/api/inventory/1');
    expect(response.statusCode).toBe(200);
    expect(response.body.data.id).toBe(1);
    expect(typeof response.body.data.stock).toBe('number');
  });

  it('POST /api/inventory debe crear un nuevo stock y responder 201', async () => {
    const nuevaStock = {
      variant_id: 2,
      stock: 51,
    };
    const response = await request(app)
      .post('/api/inventory')
      .send(nuevaStock);

    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty('variant_id');
    expect(response.body.data.stock).toBe(nuevaStock.stock);
  });

  it('PUT /api/inventory/:id debe actualizar y responder 200', async () => {
    const datosActualizados = { stock: 50 };
    const response = await request(app)
      .put('/api/inventory/1')
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.stock).toBe(datosActualizados.stock);
  });

  it('DELETE /api/inventory/:id debe eliminar y responder 200', async () => {
    const response = await request(app).delete('/api/inventory/1');
    expect(response.statusCode).toBe(200);
  });

});