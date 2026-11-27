const { api, authHeader, createCleanup } = require('./helpers');

// Reglas del código que condicionan la suite:
// - cada variante tiene como máximo un registro de inventario (variant_id es único), así que
//   cada prueba que crea inventario usa su propia variante;
// - por la API solo se editan variant_id y stock; reserved no se envía y empieza en 0.
describe('Inventario (E2E)', () => {
  const cleanup = createCleanup();
  let adminHeaders;
  let productId;

  const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Si la API aceptara por error una petición que debía rechazar (201), el registro se limpia igual
  function trackIfCreated(res) {
    if (res.statusCode === 201 && res.body.data) cleanup.track('/api/inventory', res.body.data.id);
  }

  // Crea con admin una variante nueva del producto de la suite y devuelve su id
  async function createVariant() {
    const res = await api()
      .post('/api/variants')
      .set(adminHeaders)
      .send({ product_id: productId, sku: `E2E-INV-${unique()}`, color: 'Blanco', size: '26' });
    expect(res.statusCode).toBe(201);
    cleanup.track('/api/variants', res.body.data.id);
    return res.body.data.id;
  }

  // Crea con admin el inventario de una variante nueva y devuelve el registro
  async function createInventory(stock = 10) {
    const variantId = await createVariant();
    const res = await api()
      .post('/api/inventory')
      .set(adminHeaders)
      .send({ variant_id: variantId, stock });
    expect(res.statusCode).toBe(201);
    cleanup.track('/api/inventory', res.body.data.id);
    return res.body.data;
  }

  beforeAll(async () => {
    adminHeaders = await authHeader('admin');

    const res = await api()
      .post('/api/products')
      .set(adminHeaders)
      .send({ name: `E2E Inventory Product ${unique()}`, brand: 'E2E', price: 349.9 });
    expect(res.statusCode).toBe(201);
    productId = res.body.data.id;
    cleanup.track('/api/products', productId);
  });

  afterAll(() => cleanup.run());

  describe('ciclo completo del inventario de una variante (admin)', () => {
    let variantId;
    let inventoryId;

    it('crear con stock responde 201 y reserved empieza en 0', async () => {
      variantId = await createVariant();

      const res = await api()
        .post('/api/inventory')
        .set(adminHeaders)
        .send({ variant_id: variantId, stock: 25 });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.variant_id).toBe(variantId);
      expect(res.body.data.stock).toBe(25);
      expect(res.body.data.reserved).toBe(0);

      inventoryId = res.body.data.id;
      cleanup.track('/api/inventory', inventoryId);
    });

    it('consultar por id responde 200 con los mismos datos', async () => {
      const res = await api()
        .get(`/api/inventory/${inventoryId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(inventoryId);
      expect(res.body.data.variant_id).toBe(variantId);
      expect(res.body.data.stock).toBe(25);
      expect(res.body.data.reserved).toBe(0);
    });

    it('listar responde 200 y el registro aparece', async () => {
      const res = await api()
        .get('/api/inventory')
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((record) => record.id === inventoryId);
      expect(found).toBeDefined();
      expect(found.stock).toBe(25);
    });

    it('actualizar el stock responde 200 y el cambio se aplica', async () => {
      const res = await api()
        .put(`/api/inventory/${inventoryId}`)
        .set(adminHeaders)
        .send({ stock: 40 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.stock).toBe(40);

      const getRes = await api()
        .get(`/api/inventory/${inventoryId}`)
        .set(adminHeaders);
      expect(getRes.body.data.stock).toBe(40);
    });

    it('GET /api/products/:id devuelve la variante con su inventario actualizado', async () => {
      const res = await api()
        .get(`/api/products/${productId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      const variant = res.body.data.variants.find((v) => v.id === variantId);
      expect(variant).toBeDefined();
      expect(variant.inventory).toBeDefined();
      expect(variant.inventory.id).toBe(inventoryId);
      expect(variant.inventory.stock).toBe(40);
    });

    it('eliminar responde 200', async () => {
      const res = await api()
        .delete(`/api/inventory/${inventoryId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
    });

    it('consultar el registro eliminado responde 404', async () => {
      const res = await api()
        .get(`/api/inventory/${inventoryId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('validaciones', () => {
    it('crear un segundo inventario para la misma variante responde 400', async () => {
      const existing = await createInventory();

      const res = await api()
        .post('/api/inventory')
        .set(adminHeaders)
        .send({ variant_id: existing.variant_id, stock: 5 });

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('crear con stock negativo responde 400', async () => {
      const variantId = await createVariant();

      const res = await api()
        .post('/api/inventory')
        .set(adminHeaders)
        .send({ variant_id: variantId, stock: -1 });

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('actualizar con stock negativo responde 400 y el stock no cambia', async () => {
      const record = await createInventory(12);

      const res = await api()
        .put(`/api/inventory/${record.id}`)
        .set(adminHeaders)
        .send({ stock: -5 });
      expect(res.statusCode).toBe(400);

      const getRes = await api()
        .get(`/api/inventory/${record.id}`)
        .set(adminHeaders);
      expect(getRes.body.data.stock).toBe(12);
    });

    it('crear con un variant_id que no existe responde 400', async () => {
      const res = await api()
        .post('/api/inventory')
        .set(adminHeaders)
        .send({ variant_id: 999999, stock: 3 });

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/inventory/abc responde 400', async () => {
      const res = await api()
        .get('/api/inventory/abc')
        .set(adminHeaders);

      expect(res.statusCode).toBe(400);
    });

    it('GET /api/inventory/999999 responde 404', async () => {
      const res = await api()
        .get('/api/inventory/999999')
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('autenticación y autorización', () => {
    it('GET /api/inventory sin token responde 401', async () => {
      const res = await api().get('/api/inventory');
      expect(res.statusCode).toBe(401);
    });

    it('el rol sales puede actualizar el stock (200)', async () => {
      const record = await createInventory(8);

      const res = await api()
        .put(`/api/inventory/${record.id}`)
        .set(await authHeader('sales'))
        .send({ stock: 6 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.stock).toBe(6);
    });

    it('el rol sales no puede eliminar (403) y el registro sigue existiendo', async () => {
      const record = await createInventory();

      const res = await api()
        .delete(`/api/inventory/${record.id}`)
        .set(await authHeader('sales'));
      expect(res.statusCode).toBe(403);

      const getRes = await api()
        .get(`/api/inventory/${record.id}`)
        .set(adminHeaders);
      expect(getRes.statusCode).toBe(200);
    });

    it('el rol user no puede consultar el inventario (403)', async () => {
      const res = await api()
        .get('/api/inventory')
        .set(await authHeader('user'));

      expect(res.statusCode).toBe(403);
    });
  });
});
