const request = require('supertest');
const app = require('../app');

describe('API de Products', () => {

  it('GET /api/products debe responder 200 con un arreglo de productos', async () => {
    const response = await request(app).get('/api/products');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0]).toHaveProperty('name');
  });

  it('GET /api/products/:id debe responder 200 con el producto correcto', async () => {
    const response = await request(app).get('/api/products/1');
    expect(response.statusCode).toBe(200);
    expect(response.body.data.id).toBe(1);
    expect(typeof response.body.data.price).toBe('number');
  });

  it('POST /api/products debe crear un producto y responder 201', async () => {
    const nuevoProducto = {
      category_id: 10,
      name: 'Tenis Trail X',
      brand: 'Stride',
      price: 1599.99
    };
    const response = await request(app)
      .post('/api/products')
      .send(nuevoProducto);

    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty('category_id');
    expect(response.body.data.name).toBe(nuevoProducto.name);
  });

  it('PUT /api/products/:id debe actualizar y responder 200', async () => {
    const datosActualizados = { name: 'Tenis Rail Z' };
    const response = await request(app)
      .put('/api/products/1')
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.name).toBe(datosActualizados.name);
  });

  it('DELETE /api/products/:id debe eliminar y responder 200', async () => {
    const response = await request(app).delete('/api/products/1');
    expect(response.statusCode).toBe(200);
  });


});