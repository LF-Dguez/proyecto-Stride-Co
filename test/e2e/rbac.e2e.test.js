const es = require('../../locales/es.json');
const en = require('../../locales/en.json');
const { api, authHeader, createCleanup } = require('./helpers');

// Los cinco escenarios mínimos de la Tarea 6 contra la API en ejecución, con los permisos
// que siembra `npm run seed` (seeders/rbacMatrix.js).
describe('RBAC (E2E): escenarios mínimos de la Tarea 6', () => {
  const cleanup = createCleanup();
  let adminHeaders;
  let salesHeaders;
  let userHeaders;
  let demoUserId;
  let productId;
  let foreignOrderId; // orden de otro usuario (escenarios 4 y 5)

  const OTHER_USER_ID = 2000000000;
  const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  async function createProduct() {
    const res = await api()
      .post('/api/products')
      .set(adminHeaders)
      .send({ name: `E2E RBAC Product ${unique()}`, brand: 'E2E', price: 199 });
    expect(res.statusCode).toBe(201);
    cleanup.track('/api/products', res.body.data.id);
    return res.body.data.id;
  }

  // Cliente con el userId indicado y una orden suya, creados con admin
  async function createOrderFor(userId) {
    const customerRes = await api()
      .post('/api/customers')
      .set(adminHeaders)
      .send({ userId, email: `e2e-rbac-${unique()}@stride.co` });
    expect(customerRes.statusCode).toBe(201);
    cleanup.track('/api/customers', customerRes.body.data._id);

    const orderRes = await api()
      .post('/api/orders')
      .set(adminHeaders)
      .send({
        customerId: customerRes.body.data._id,
        paymentMethod: 'CASH',
        items: [{ productId, quantity: 1, unitPrice: 199 }]
      });
    expect(orderRes.statusCode).toBe(201);
    cleanup.track('/api/orders', orderRes.body.data._id);
    return orderRes.body.data._id;
  }

  beforeAll(async () => {
    adminHeaders = await authHeader('admin');
    salesHeaders = await authHeader('sales');
    userHeaders = await authHeader('user');

    const me = await api().get('/api/auth/me').set(userHeaders);
    expect(me.statusCode).toBe(200);
    demoUserId = me.body.data.id;

    productId = await createProduct();
    foreignOrderId = await createOrderFor(OTHER_USER_ID);
  });

  afterAll(() => cleanup.run());

  it('1. ADMIN con products:delete:any elimina un producto -> 200', async () => {
    const id = await createProduct();

    const res = await api()
      .delete(`/api/products/${id}`)
      .set(adminHeaders);

    expect(res.statusCode).toBe(200);
  });

  it('2. SALES sin products:delete:any no puede eliminar -> 403 y el producto sigue existiendo', async () => {
    const id = await createProduct();

    const res = await api()
      .delete(`/api/products/${id}`)
      .set(salesHeaders);
    expect(res.statusCode).toBe(403);

    const getRes = await api()
      .get(`/api/products/${id}`)
      .set(adminHeaders);
    expect(getRes.statusCode).toBe(200);
  });

  it('3. USER con orders:read:own consulta su propia orden -> 200', async () => {
    const ownOrderId = await createOrderFor(demoUserId);

    const res = await api()
      .get(`/api/orders/${ownOrderId}`)
      .set(userHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body.data._id).toBe(ownOrderId);
  });

  it('4. USER con orders:read:own consulta la orden de otro usuario -> 403', async () => {
    const res = await api()
      .get(`/api/orders/${foreignOrderId}`)
      .set(userHeaders);

    expect(res.statusCode).toBe(403);
  });

  it('5. USER sin orders:read:any ni orders:delete:any: su listado no incluye órdenes ajenas y no puede eliminar -> 403', async () => {
    const adminList = await api()
      .get('/api/orders')
      .set(adminHeaders);
    expect(adminList.statusCode).toBe(200);
    expect(adminList.body.data.some((o) => o._id === foreignOrderId)).toBe(true);

    const userList = await api()
      .get('/api/orders')
      .set(userHeaders);
    expect(userList.statusCode).toBe(200);
    expect(userList.body.data.some((o) => o._id === foreignOrderId)).toBe(false);

    const deleteRes = await api()
      .delete(`/api/orders/${foreignOrderId}`)
      .set(userHeaders);
    expect(deleteRes.statusCode).toBe(403);

    // La orden sigue existiendo
    const getRes = await api()
      .get(`/api/orders/${foreignOrderId}`)
      .set(adminHeaders);
    expect(getRes.statusCode).toBe(200);
  });

  describe('respuesta 403', () => {
    it('tiene la forma { message, data: null } y el message sale traducido (es / en)', async () => {
      const resEs = await api()
        .delete(`/api/products/${productId}`)
        .set(salesHeaders)
        .set('Accept-Language', 'es');
      expect(resEs.statusCode).toBe(403);
      expect(resEs.body).toEqual({ message: es.common.forbidden, data: null });

      const resEn = await api()
        .delete(`/api/products/${productId}`)
        .set(salesHeaders)
        .set('Accept-Language', 'en');
      expect(resEn.statusCode).toBe(403);
      expect(resEn.body).toEqual({ message: en.common.forbidden, data: null });
    });
  });
});
