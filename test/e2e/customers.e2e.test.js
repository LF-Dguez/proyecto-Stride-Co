const { api, authHeader, createCleanup } = require('./helpers');

// Clientes viven en MongoDB: el id es _id (ObjectId) y el dueño es userId (id del usuario en PostgreSQL).
// El rol user tiene customers:read:own y customers:update:own (services/ownership.js).
describe('Clientes (E2E)', () => {
  const cleanup = createCleanup();
  let adminHeaders;
  let userHeaders;
  let demoUserId;

  // ObjectId bien formado que no corresponde a ningún documento
  const MISSING_OBJECT_ID = '000000000000000000000000';
  // userId de otra persona: ningún usuario del seed tiene este id
  const OTHER_USER_ID = 2000000000;

  const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Si la API aceptara por error una petición que debía rechazar (201), el documento se limpia igual
  function trackIfCreated(res) {
    if (res.statusCode === 201 && res.body.data) cleanup.track('/api/customers', res.body.data._id);
  }

  function makeCustomer(overrides = {}) {
    return {
      email: `e2e-customer-${unique()}@stride.co`,
      phone: '6141234567',
      addresses: [{ type: 'SHIPPING', street: 'Av. Universidad', number: '100', city: 'Chihuahua', state: 'Chihuahua' }],
      ...overrides
    };
  }

  // Crea un cliente con admin, lo registra para limpieza y devuelve el documento
  async function createCustomer(overrides = {}) {
    const res = await api()
      .post('/api/customers')
      .set(adminHeaders)
      .send(makeCustomer(overrides));
    expect(res.statusCode).toBe(201);
    cleanup.track('/api/customers', res.body.data._id);
    return res.body.data;
  }

  beforeAll(async () => {
    adminHeaders = await authHeader('admin');
    userHeaders = await authHeader('user');

    // Id real del usuario de demostración user, para probar el alcance own
    const me = await api().get('/api/auth/me').set(userHeaders);
    expect(me.statusCode).toBe(200);
    demoUserId = me.body.data.id;
  });

  afterAll(() => cleanup.run());

  describe('ciclo completo de un cliente (admin)', () => {
    let customerId;
    let payload;

    it('crear con email, phone y dirección SHIPPING responde 201', async () => {
      payload = makeCustomer();

      const res = await api()
        .post('/api/customers')
        .set(adminHeaders)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.email).toBe(payload.email);
      expect(res.body.data.phone).toBe(payload.phone);
      expect(res.body.data.addresses).toHaveLength(1);
      expect(res.body.data.addresses[0].type).toBe('SHIPPING');

      customerId = res.body.data._id;
      cleanup.track('/api/customers', customerId);
    });

    it('consultar por id responde 200 con los mismos datos', async () => {
      const res = await api()
        .get(`/api/customers/${customerId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(customerId);
      expect(res.body.data.email).toBe(payload.email);
      expect(res.body.data.phone).toBe(payload.phone);
      expect(res.body.data.addresses[0].street).toBe(payload.addresses[0].street);
      expect(res.body.data.addresses[0].city).toBe(payload.addresses[0].city);
    });

    it('listar responde 200 y el cliente aparece', async () => {
      const res = await api()
        .get('/api/customers')
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((c) => c._id === customerId)).toBe(true);
    });

    it('actualizar el phone responde 200 y el cambio se aplica', async () => {
      const res = await api()
        .put(`/api/customers/${customerId}`)
        .set(adminHeaders)
        .send({ phone: '6149998877' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.phone).toBe('6149998877');

      const getRes = await api()
        .get(`/api/customers/${customerId}`)
        .set(adminHeaders);
      expect(getRes.body.data.phone).toBe('6149998877');
    });

    it('eliminar responde 200', async () => {
      const res = await api()
        .delete(`/api/customers/${customerId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
    });

    it('consultar el cliente eliminado responde 404', async () => {
      const res = await api()
        .get(`/api/customers/${customerId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('alcance own (rol user)', () => {
    let ownCustomer;
    let otherCustomer;

    beforeAll(async () => {
      ownCustomer = await createCustomer({ userId: demoUserId });
      otherCustomer = await createCustomer({ userId: OTHER_USER_ID });
    });

    it('consultar su propio cliente responde 200', async () => {
      const res = await api()
        .get(`/api/customers/${ownCustomer._id}`)
        .set(userHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(ownCustomer._id);
      expect(res.body.data.userId).toBe(demoUserId);
    });

    it('consultar el cliente de otro usuario responde 403', async () => {
      const res = await api()
        .get(`/api/customers/${otherCustomer._id}`)
        .set(userHeaders);

      expect(res.statusCode).toBe(403);
    });

    it('GET /api/customers solo devuelve sus clientes', async () => {
      const res = await api()
        .get('/api/customers')
        .set(userHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((c) => c.userId === demoUserId)).toBe(true);
      expect(res.body.data.some((c) => c._id === ownCustomer._id)).toBe(true);
      expect(res.body.data.some((c) => c._id === otherCustomer._id)).toBe(false);
    });

    it('POST /api/customers responde 403', async () => {
      const res = await api()
        .post('/api/customers')
        .set(userHeaders)
        .send(makeCustomer({ userId: demoUserId }));

      trackIfCreated(res);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('validaciones', () => {
    it('crear con un email mal formado responde 400', async () => {
      const res = await api()
        .post('/api/customers')
        .set(adminHeaders)
        .send(makeCustomer({ email: 'correo-sin-arroba' }));

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('crear con una dirección de type no permitido responde 400', async () => {
      const res = await api()
        .post('/api/customers')
        .set(adminHeaders)
        .send(makeCustomer({ addresses: [{ type: 'OFFICE', street: 'Calle 1', city: 'Chihuahua' }] }));

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/customers/abc (id mal formado) responde 400', async () => {
      const res = await api()
        .get('/api/customers/abc')
        .set(adminHeaders);

      expect(res.statusCode).toBe(400);
    });

    it('GET de un ObjectId válido que no existe responde 404', async () => {
      const res = await api()
        .get(`/api/customers/${MISSING_OBJECT_ID}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });

    it('GET /api/customers sin token responde 401', async () => {
      const res = await api().get('/api/customers');
      expect(res.statusCode).toBe(401);
    });
  });
});
