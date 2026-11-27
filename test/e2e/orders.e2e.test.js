const { api, authHeader, createCleanup } = require('./helpers');

// Órdenes viven en MongoDB: customerId apunta a un Customer y los items guardan el id y el precio
// de un producto de PostgreSQL. El dueño de una orden es el userId de su cliente (services/ownership.js).
describe('Órdenes (E2E)', () => {
  const cleanup = createCleanup();
  let adminHeaders;
  let userHeaders;
  let demoUserId;
  let product;
  let customer;

  const MISSING_OBJECT_ID = '000000000000000000000000';
  const OTHER_USER_ID = 2000000000;

  const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Si la API aceptara por error una petición que debía rechazar (201), el documento se limpia igual
  function trackIfCreated(res) {
    if (res.statusCode === 201 && res.body.data) cleanup.track('/api/orders', res.body.data._id);
  }

  async function createCustomer(overrides = {}) {
    const res = await api()
      .post('/api/customers')
      .set(adminHeaders)
      .send({ email: `e2e-order-customer-${unique()}@stride.co`, phone: '6145550000', ...overrides });
    expect(res.statusCode).toBe(201);
    cleanup.track('/api/customers', res.body.data._id);
    return res.body.data;
  }

  function makeOrder(customerId, overrides = {}) {
    return {
      customerId,
      paymentMethod: 'CARD',
      items: [{ productId: product.id, quantity: 2, unitPrice: product.price }],
      ...overrides
    };
  }

  // Crea una orden con admin; se registra después de su cliente para eliminarse antes que él
  async function createOrder(customerId) {
    const res = await api()
      .post('/api/orders')
      .set(adminHeaders)
      .send(makeOrder(customerId));
    expect(res.statusCode).toBe(201);
    cleanup.track('/api/orders', res.body.data._id);
    return res.body.data;
  }

  beforeAll(async () => {
    adminHeaders = await authHeader('admin');
    userHeaders = await authHeader('user');

    const me = await api().get('/api/auth/me').set(userHeaders);
    expect(me.statusCode).toBe(200);
    demoUserId = me.body.data.id;

    // Producto propio de la suite: su id y su precio se usan en los items (sin ids fijos)
    const productRes = await api()
      .post('/api/products')
      .set(adminHeaders)
      .send({ name: `E2E Orders Product ${unique()}`, brand: 'E2E', price: 450 });
    expect(productRes.statusCode).toBe(201);
    cleanup.track('/api/products', productRes.body.data.id);
    product = { id: productRes.body.data.id, price: Number(productRes.body.data.price) };

    customer = await createCustomer();
  });

  afterAll(() => cleanup.run());

  describe('ciclo completo de una orden (admin)', () => {
    let orderId;

    it('crear responde 201 y calcula subtotal y total a partir de los items', async () => {
      const res = await api()
        .post('/api/orders')
        .set(adminHeaders)
        .send(makeOrder(customer._id));

      expect(res.statusCode).toBe(201);
      expect(res.body.data.customerId).toBe(customer._id);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.paymentMethod).toBe('CARD');
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].productId).toBe(product.id);
      expect(res.body.data.totals.subtotal).toBeCloseTo(product.price * 2);
      expect(res.body.data.totals.total).toBeCloseTo(product.price * 2);

      orderId = res.body.data._id;
      cleanup.track('/api/orders', orderId);
    });

    it('consultar por id responde 200 y data.customerId trae los datos del cliente', async () => {
      const res = await api()
        .get(`/api/orders/${orderId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(orderId);
      // populate: el cliente llega como objeto, no solo como id
      expect(typeof res.body.data.customerId).toBe('object');
      expect(res.body.data.customerId._id).toBe(customer._id);
      expect(res.body.data.customerId.email).toBe(customer.email);
    });

    it('listar responde 200 y la orden aparece', async () => {
      const res = await api()
        .get('/api/orders')
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((o) => o._id === orderId)).toBe(true);
    });

    it('actualizar el status a PAID responde 200 y el cambio se aplica', async () => {
      const res = await api()
        .put(`/api/orders/${orderId}`)
        .set(adminHeaders)
        .send({ status: 'PAID' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('PAID');

      const getRes = await api()
        .get(`/api/orders/${orderId}`)
        .set(adminHeaders);
      expect(getRes.body.data.status).toBe('PAID');
    });

    it('eliminar responde 200', async () => {
      const res = await api()
        .delete(`/api/orders/${orderId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
    });

    it('consultar la orden eliminada responde 404', async () => {
      const res = await api()
        .get(`/api/orders/${orderId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('alcance own (rol user)', () => {
    let ownOrder;
    let otherOrder;

    beforeAll(async () => {
      const ownCustomer = await createCustomer({ userId: demoUserId });
      ownOrder = await createOrder(ownCustomer._id);

      const otherCustomer = await createCustomer({ userId: OTHER_USER_ID });
      otherOrder = await createOrder(otherCustomer._id);
    });

    it('consultar su propia orden responde 200', async () => {
      const res = await api()
        .get(`/api/orders/${ownOrder._id}`)
        .set(userHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(ownOrder._id);
    });

    it('consultar la orden de otro usuario responde 403', async () => {
      const res = await api()
        .get(`/api/orders/${otherOrder._id}`)
        .set(userHeaders);

      expect(res.statusCode).toBe(403);
    });

    it('GET /api/orders solo devuelve órdenes de sus clientes', async () => {
      const res = await api()
        .get('/api/orders')
        .set(userHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Cada orden pertenece a uno de los clientes del user (los que ve con su alcance own)
      const myCustomers = await api().get('/api/customers').set(userHeaders);
      const myCustomerIds = new Set(myCustomers.body.data.map((c) => c._id));
      expect(res.body.data.every((o) => myCustomerIds.has(o.customerId._id))).toBe(true);
      expect(res.body.data.some((o) => o._id === ownOrder._id)).toBe(true);
      expect(res.body.data.some((o) => o._id === otherOrder._id)).toBe(false);
    });

    it('DELETE /api/orders/:id responde 403 y la orden sigue existiendo', async () => {
      const res = await api()
        .delete(`/api/orders/${ownOrder._id}`)
        .set(userHeaders);
      expect(res.statusCode).toBe(403);

      const getRes = await api()
        .get(`/api/orders/${ownOrder._id}`)
        .set(adminHeaders);
      expect(getRes.statusCode).toBe(200);
    });
  });

  describe('validaciones', () => {
    it('crear sin customerId responde 400', async () => {
      const order = makeOrder(customer._id);
      delete order.customerId;

      const res = await api()
        .post('/api/orders')
        .set(adminHeaders)
        .send(order);

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('crear con un item de quantity 0 responde 400', async () => {
      const res = await api()
        .post('/api/orders')
        .set(adminHeaders)
        .send(makeOrder(customer._id, { items: [{ productId: product.id, quantity: 0, unitPrice: product.price }] }));

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/orders/abc responde 400', async () => {
      const res = await api()
        .get('/api/orders/abc')
        .set(adminHeaders);

      expect(res.statusCode).toBe(400);
    });

    it('GET de un ObjectId válido que no existe responde 404', async () => {
      const res = await api()
        .get(`/api/orders/${MISSING_OBJECT_ID}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });

    it('GET /api/orders sin token responde 401', async () => {
      const res = await api().get('/api/orders');
      expect(res.statusCode).toBe(401);
    });
  });
});
