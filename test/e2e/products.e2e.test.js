const { api, authHeader, createCleanup } = require('./helpers');

describe('Productos (E2E)', () => {
  const cleanup = createCleanup();
  let adminHeaders;

  beforeAll(async () => {
    adminHeaders = await authHeader('admin');
  });

  afterAll(() => cleanup.run());

  // ─── helpers ───────────────────────────────────────────────────────

  // Date.now() + sufijo aleatorio: dos registros creados en el mismo milisegundo
  // no deben compartir nombre ni SKU (corrección del equipo)
  const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Si la API aceptara por error una petición que debía rechazar (201), el registro se limpia igual
  function trackIfCreated(res) {
    if (res.statusCode === 201 && res.body.data) cleanup.track('/api/products', res.body.data.id);
  }

  function makeProduct(overrides = {}) {
    return {
      name: `E2E Product ${unique()}`,
      brand: 'E2E Brand',
      price: 499.99,
      ...overrides
    };
  }

  function makeVariant(productId, overrides = {}) {
    return {
      product_id: productId,
      sku: `E2E-SKU-${unique()}`,
      color: 'Negro',
      size: '28',
      ...overrides
    };
  }

  // ─── ciclo completo (admin) ────────────────────────────────────────

  describe('ciclo completo de un producto (admin)', () => {
    let createdId;
    let productData;

    it('crear producto responde 201', async () => {
      const payload = makeProduct();
      productData = payload;

      const res = await api()
        .post('/api/products')
        .set(adminHeaders)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data.brand).toBe(payload.brand);
      expect(Number(res.body.data.price)).toBe(payload.price);

      createdId = res.body.data.id;
      cleanup.track('/api/products', createdId);
    });

    it('consultar por id responde 200 con los mismos datos', async () => {
      const res = await api()
        .get(`/api/products/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(createdId);
      expect(res.body.data.name).toBe(productData.name);
      expect(res.body.data.brand).toBe(productData.brand);
      expect(Number(res.body.data.price)).toBe(productData.price);
    });

    it('listar productos responde 200 y el producto aparece', async () => {
      const res = await api()
        .get('/api/products')
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((p) => p.id === createdId);
      expect(found).toBeDefined();
      expect(found.name).toBe(productData.name);
    });

    it('actualizar nombre y precio responde 200 y el cambio se aplica', async () => {
      const newName = 'Producto Actualizado E2E';
      const newPrice = 899.50;

      const res = await api()
        .put(`/api/products/${createdId}`)
        .set(adminHeaders)
        .send({ name: newName, price: newPrice });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe(newName);
      expect(Number(res.body.data.price)).toBe(newPrice);

      // Verificar que el cambio persiste
      const getRes = await api()
        .get(`/api/products/${createdId}`)
        .set(adminHeaders);
      expect(getRes.body.data.name).toBe(newName);
      expect(Number(getRes.body.data.price)).toBe(newPrice);
    });

    it('eliminar producto responde 200', async () => {
      const res = await api()
        .delete(`/api/products/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
    });

    it('consultar producto eliminado responde 404', async () => {
      const res = await api()
        .get(`/api/products/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── relación con variantes ────────────────────────────────────────

  describe('relación producto → variantes', () => {
    it('GET /api/products/:id incluye la variante creada en data.variants', async () => {
      // Crear producto
      const productRes = await api()
        .post('/api/products')
        .set(adminHeaders)
        .send(makeProduct());
      expect(productRes.statusCode).toBe(201);
      const productId = productRes.body.data.id;
      cleanup.track('/api/products', productId);

      // Crear variante del producto
      const variantPayload = makeVariant(productId);
      const variantRes = await api()
        .post('/api/variants')
        .set(adminHeaders)
        .send(variantPayload);
      expect(variantRes.statusCode).toBe(201);
      const variantId = variantRes.body.data.id;
      // Registrar variante DESPUÉS del producto → cleanup borra variante primero
      cleanup.track('/api/variants', variantId);

      // Consultar producto y verificar que incluye la variante
      const getRes = await api()
        .get(`/api/products/${productId}`)
        .set(adminHeaders);

      expect(getRes.statusCode).toBe(200);
      expect(Array.isArray(getRes.body.data.variants)).toBe(true);

      const found = getRes.body.data.variants.find((v) => v.id === variantId);
      expect(found).toBeDefined();
      expect(found.sku).toBe(variantPayload.sku);
      expect(found.color).toBe(variantPayload.color);
      expect(found.size).toBe(variantPayload.size);
    });
  });

  // ─── validaciones ──────────────────────────────────────────────────

  describe('validaciones', () => {
    it('crear sin name responde 400', async () => {
      const res = await api()
        .post('/api/products')
        .set(adminHeaders)
        .send({ brand: 'Sin nombre', price: 100 });

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('crear con price negativo responde 400', async () => {
      const res = await api()
        .post('/api/products')
        .set(adminHeaders)
        .send(makeProduct({ price: -10 }));

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/products/abc responde 400', async () => {
      const res = await api()
        .get('/api/products/abc')
        .set(adminHeaders);

      expect(res.statusCode).toBe(400);
    });

    it('GET /api/products/999999 responde 404', async () => {
      const res = await api()
        .get('/api/products/999999')
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── autenticación y autorización ──────────────────────────────────

  describe('autenticación y autorización', () => {
    it('GET /api/products sin token responde 401', async () => {
      const res = await api().get('/api/products');
      expect(res.statusCode).toBe(401);
    });

    it('el rol user puede listar productos (200)', async () => {
      const userHeaders = await authHeader('user');
      const res = await api()
        .get('/api/products')
        .set(userHeaders);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('el rol user no puede crear productos (403)', async () => {
      const userHeaders = await authHeader('user');
      const res = await api()
        .post('/api/products')
        .set(userHeaders)
        .send(makeProduct());

      trackIfCreated(res);
      expect(res.statusCode).toBe(403);
    });

    it('el rol sales no puede eliminar productos (403)', async () => {
      // Crear un producto para intentar borrarlo con sales
      const productRes = await api()
        .post('/api/products')
        .set(adminHeaders)
        .send(makeProduct());
      expect(productRes.statusCode).toBe(201);
      const productId = productRes.body.data.id;
      cleanup.track('/api/products', productId);

      const salesHeaders = await authHeader('sales');
      const res = await api()
        .delete(`/api/products/${productId}`)
        .set(salesHeaders);

      expect(res.statusCode).toBe(403);

      // El producto sigue existiendo (corrección del equipo: un 403 no debe borrar nada)
      const getRes = await api()
        .get(`/api/products/${productId}`)
        .set(adminHeaders);
      expect(getRes.statusCode).toBe(200);
    });
  });
});
