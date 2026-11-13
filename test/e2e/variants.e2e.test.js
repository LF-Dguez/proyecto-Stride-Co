const { api, authHeader, createCleanup } = require('./helpers');

describe('Variantes (E2E)', () => {
  const cleanup = createCleanup();
  let adminHeaders;
  let testProductId;

  beforeAll(async () => {
    adminHeaders = await authHeader('admin');

    // Producto propio de la suite para asociar variantes
    const res = await api()
      .post('/api/products')
      .set(adminHeaders)
      .send({ name: `E2E Variants Product ${Date.now()}`, brand: 'E2E', price: 299.99 });
    expect(res.statusCode).toBe(201);
    testProductId = res.body.data.id;
    cleanup.track('/api/products', testProductId);
  });

  afterAll(() => cleanup.run());

  // ─── helpers ───────────────────────────────────────────────────────

  function uniqueSku() {
    return `E2E-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function makeVariant(overrides = {}) {
    return {
      product_id: testProductId,
      sku: uniqueSku(),
      color: 'Azul',
      size: '27',
      ...overrides
    };
  }

  // Si una prueba de error recibe 201, registra el recurso para no dejar basura
  function trackIfCreated(res) {
    if (res.statusCode === 201 && res.body.data && res.body.data.id) {
      cleanup.track('/api/variants', res.body.data.id);
    }
  }

  // ─── ciclo completo (admin) ────────────────────────────────────────

  describe('ciclo completo de una variante (admin)', () => {
    let createdId;
    let variantData;

    it('crear variante responde 201', async () => {
      const payload = makeVariant();
      variantData = payload;

      const res = await api()
        .post('/api/variants')
        .set(adminHeaders)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.sku).toBe(payload.sku);
      expect(res.body.data.color).toBe(payload.color);
      expect(res.body.data.size).toBe(payload.size);
      expect(res.body.data.product_id).toBe(testProductId);

      createdId = res.body.data.id;
      cleanup.track('/api/variants', createdId);
    });

    it('consultar por id responde 200 con los mismos datos e incluye data.product', async () => {
      const res = await api()
        .get(`/api/variants/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(createdId);
      expect(res.body.data.sku).toBe(variantData.sku);
      expect(res.body.data.color).toBe(variantData.color);
      expect(res.body.data.size).toBe(variantData.size);

      // Incluye el producto asociado
      expect(res.body.data.product).toBeDefined();
      expect(res.body.data.product.id).toBe(testProductId);
    });

    it('listar variantes responde 200 y la variante aparece', async () => {
      const res = await api()
        .get('/api/variants')
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((v) => v.id === createdId);
      expect(found).toBeDefined();
      expect(found.sku).toBe(variantData.sku);
    });

    it('actualizar color y talla responde 200', async () => {
      const newColor = 'Rojo';
      const newSize = '30';

      const res = await api()
        .put(`/api/variants/${createdId}`)
        .set(adminHeaders)
        .send({ color: newColor, size: newSize });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.color).toBe(newColor);
      expect(res.body.data.size).toBe(newSize);

      // Verificar que el cambio persiste
      const getRes = await api()
        .get(`/api/variants/${createdId}`)
        .set(adminHeaders);
      expect(getRes.body.data.color).toBe(newColor);
      expect(getRes.body.data.size).toBe(newSize);
    });

    it('eliminar variante responde 200', async () => {
      const res = await api()
        .delete(`/api/variants/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
    });

    it('consultar variante eliminada responde 404', async () => {
      const res = await api()
        .get(`/api/variants/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── validaciones ──────────────────────────────────────────────────

  describe('validaciones', () => {
    it('crear con sku duplicado responde 400', async () => {
      const payload = makeVariant();

      const first = await api()
        .post('/api/variants')
        .set(adminHeaders)
        .send(payload);
      expect(first.statusCode).toBe(201);
      cleanup.track('/api/variants', first.body.data.id);

      const duplicate = await api()
        .post('/api/variants')
        .set(adminHeaders)
        .send(payload);
      trackIfCreated(duplicate);
      expect(duplicate.statusCode).toBe(400);
    });

    it('crear con product_id inexistente responde 400', async () => {
      const res = await api()
        .post('/api/variants')
        .set(adminHeaders)
        .send(makeVariant({ product_id: 999999 }));
      trackIfCreated(res);

      expect(res.statusCode).toBe(400);
    });

    it('crear sin sku responde 400', async () => {
      const payload = makeVariant();
      delete payload.sku;

      const res = await api()
        .post('/api/variants')
        .set(adminHeaders)
        .send(payload);
      trackIfCreated(res);

      expect(res.statusCode).toBe(400);
    });

    it('GET /api/variants/abc responde 400', async () => {
      const res = await api()
        .get('/api/variants/abc')
        .set(adminHeaders);

      expect(res.statusCode).toBe(400);
    });

    it('GET /api/variants/999999 responde 404', async () => {
      const res = await api()
        .get('/api/variants/999999')
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── autenticación y autorización ──────────────────────────────────

  describe('autenticación y autorización', () => {
    it('GET /api/variants sin token responde 401', async () => {
      const res = await api().get('/api/variants');
      expect(res.statusCode).toBe(401);
    });

    it('el rol user puede consultar variantes (200)', async () => {
      const userHeaders = await authHeader('user');
      const res = await api()
        .get('/api/variants')
        .set(userHeaders);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('el rol user no puede crear variantes (403)', async () => {
      const userHeaders = await authHeader('user');
      const res = await api()
        .post('/api/variants')
        .set(userHeaders)
        .send(makeVariant());
      trackIfCreated(res);

      expect(res.statusCode).toBe(403);
    });
  });
});
