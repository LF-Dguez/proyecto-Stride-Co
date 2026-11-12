// Issue #99: customers, orders y los mensajes de propiedad (services/ownership.js)
// responden en es y en, por ?lang= y por Accept-Language, con la misma petición.
const request = require('supertest');
const customersRouter = require('../routes/customers');
const ordersRouter = require('../routes/orders');
const Customer = require('../models/mongo/Customer');
const Order = require('../models/mongo/Order');
const { buildApp, users } = require('./helpers/rbacApp');

const app = buildApp((a) => {
  a.use('/api/customers', customersRouter);
  a.use('/api/orders', ordersRouter);
});

function mockLean(value) {
  const query = { populate: jest.fn(() => query), lean: () => Promise.resolve(value) };
  return query;
}

function mockLeanRejects(err) {
  const query = { populate: jest.fn(() => query), lean: () => Promise.reject(err) };
  return query;
}

function castError() {
  const err = new Error('Cast to ObjectId failed');
  err.name = 'CastError';
  return err;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('i18n en customers, orders y ownership (issue #99)', () => {
  it('GET /api/customers (200): mismo mensaje, en es y en', async () => {
    jest.spyOn(Customer, 'find').mockReturnValue(mockLean([]));
    const es = await request(app).get('/api/customers').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/customers?lang=en').set(users.admin);

    expect(es.body.message).toBe('GET clientes obtenido exitosamente (Modelo Documental MongoDB)');
    expect(en.body.message).toBe('GET customers retrieved successfully (MongoDB document model)');
  });

  it('GET /api/customers/:id inexistente (404): mismo mensaje, en es y en', async () => {
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(null));
    const es = await request(app).get('/api/customers/000000000000000000000000').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/customers/000000000000000000000000?lang=en').set(users.admin);

    expect(es.body.message).toBe('Cliente no encontrado');
    expect(en.body.message).toBe('Customer not found');
  });

  it('GET /api/customers/:id con id mal formado (400): mismo mensaje, en es y en', async () => {
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLeanRejects(castError()));
    const es = await request(app).get('/api/customers/no-es-un-id').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/customers/no-es-un-id?lang=en').set(users.admin);

    expect(es.body.message).toBe('Id de cliente inválido');
    expect(en.body.message).toBe('Invalid customer ID');
  });

  it('GET /api/orders (200): mismo mensaje, en es y en', async () => {
    jest.spyOn(Order, 'find').mockReturnValue(mockLean([]));
    const es = await request(app).get('/api/orders').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/orders?lang=en').set(users.admin);

    expect(es.body.message).toBe('GET órdenes obtenido exitosamente (Modelo Documental MongoDB)');
    expect(en.body.message).toBe('GET orders retrieved successfully (MongoDB document model)');
  });

  it('GET /api/orders/:id inexistente (404): mismo mensaje, en es y en', async () => {
    jest.spyOn(Order, 'findById').mockReturnValue(mockLean(null));
    const es = await request(app).get('/api/orders/000000000000000000000000').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/orders/000000000000000000000000?lang=en').set(users.admin);

    expect(es.body.message).toBe('Orden no encontrada');
    expect(en.body.message).toBe('Order not found');
  });

  it('GET /api/orders/:id con id mal formado (400): mismo mensaje, en es y en', async () => {
    jest.spyOn(Order, 'findById').mockReturnValue(mockLeanRejects(castError()));
    const es = await request(app).get('/api/orders/no-es-un-id').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/orders/no-es-un-id?lang=en').set(users.admin);

    expect(es.body.message).toBe('Id de orden inválido');
    expect(en.body.message).toBe('Invalid order ID');
  });

  it('own: 403 al consultar la orden de otro usuario (ownership.js), mismo flujo en es y en', async () => {
    const customerOfOther = { _id: 'c00000000000000000000a2', userId: 20 };
    const orderOfOther = { _id: 'o00000000000000000000b2', customerId: customerOfOther._id };
    jest.spyOn(Order, 'findById').mockReturnValue(mockLean(orderOfOther));
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(customerOfOther));

    const es = await request(app).get(`/api/orders/${orderOfOther._id}`).set(users.user).set('Accept-Language', 'es');
    const en = await request(app).get(`/api/orders/${orderOfOther._id}?lang=en`).set(users.user);

    expect(es.statusCode).toBe(403);
    expect(en.statusCode).toBe(403);
  });
});
