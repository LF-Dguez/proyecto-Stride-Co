// Issue #52: escenarios mínimos 11.1 a 11.5 de la Tarea 6 (RBAC), tal como los
// describe el PDF. Cada bloque corresponde 1:1 a esa sección, para que sea
// fácil verificar que la implementación cubre exactamente lo que pide la rúbrica.
const request = require('supertest');
const authorize = require('../middlewares/authorize');
const productsRouter = require('../routes/products');
const ordersRouter = require('../routes/orders');
const Order = require('../models/documents/Order');
const Customer = require('../models/documents/Customer');
const { buildApp, users } = require('./helpers/rbacApp');

afterEach(() => {
  jest.restoreAllMocks();
});

// 11.1 Acceso permitido: ADMIN, products:delete:any, cualquier producto -> permitido
describe('11.1 Acceso permitido (ADMIN, products:delete:any)', () => {
  it('admin elimina cualquier producto', async () => {
    const app = buildApp((a) => a.use('/api/products', productsRouter));
    const response = await request(app).delete('/api/products/1').set(users.admin);
    expect(response.statusCode).toBe(200);
  });
});

// 11.2 Acceso denegado: SALES, products:delete:any, cualquier producto -> 403
describe('11.2 Acceso denegado (SALES, products:delete:any)', () => {
  it('sales no puede eliminar productos', async () => {
    const app = buildApp((a) => a.use('/api/products', productsRouter));
    const response = await request(app).delete('/api/products/1').set(users.sales);
    expect(response.statusCode).toBe(403);
    expect(response.body.error.status).toBe(403);
  });
});

// 11.3 Recurso propio: USER, orders:read:own, orden propia -> permitido
describe('11.3 Recurso propio (USER, orders:read:own, orden propia)', () => {
  it('user consulta una orden que le pertenece', async () => {
    const app = buildApp((a) => a.use('/api/orders', ordersRouter));
    const customer = { _id: 'c00000000000000000000a1', userId: 10 }; // users.user = id 10
    const order = { _id: 'o00000000000000000000b1', customerId: customer._id };
    jest.spyOn(Order, 'findById').mockReturnValue({ lean: () => Promise.resolve(order) });
    jest.spyOn(Customer, 'findById').mockReturnValue({ lean: () => Promise.resolve(customer) });

    const response = await request(app).get(`/api/orders/${order._id}`).set(users.user);
    expect(response.statusCode).toBe(200);
  });
});

// 11.4 Recurso de otro usuario: USER, orders:read:own, orden ajena -> 403
describe('11.4 Recurso de otro usuario (USER, orders:read:own, orden ajena)', () => {
  it('user no puede consultar la orden de alguien más', async () => {
    const app = buildApp((a) => a.use('/api/orders', ordersRouter));
    const customerDeOtro = { _id: 'c00000000000000000000a2', userId: 20 }; // users.otherUser = id 20
    const ordenAjena = { _id: 'o00000000000000000000b2', customerId: customerDeOtro._id };
    jest.spyOn(Order, 'findById').mockReturnValue({ lean: () => Promise.resolve(ordenAjena) });
    jest.spyOn(Customer, 'findById').mockReturnValue({ lean: () => Promise.resolve(customerDeOtro) });

    const response = await request(app).get(`/api/orders/${ordenAjena._id}`).set(users.user);
    expect(response.statusCode).toBe(403);
    expect(response.body.error.status).toBe(403);
  });
});

// 11.5 Permiso any no asignado: USER, orders:read:any, cualquier orden -> 403
describe('11.5 Permiso any no asignado (USER, orders:read:any)', () => {
  it('user no tiene orders:read:any, aunque sí tenga orders:read:own', async () => {
    // La matriz solo le da a USER orders:read:own; se exige explícitamente 'any'
    // para comprobar que no hay una concesión de más (ningún endpoint real exige
    // 'any' puro en orders, así que se prueba el middleware directamente, igual
    // que test/authorize.test.js).
    const app = buildApp((a) => a.get('/orders-any', authorize('orders', 'read', 'any'), (req, res) => res.json({ ok: true })));
    const response = await request(app).get('/orders-any').set(users.user);
    expect(response.statusCode).toBe(403);
  });
});
