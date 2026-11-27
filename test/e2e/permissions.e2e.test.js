const { api, authHeader, createCleanup } = require('./helpers');

describe('Permisos (E2E)', () => {
  const cleanup = createCleanup();
  let adminHeaders;

  beforeAll(async () => {
    adminHeaders = await authHeader('admin');
  });

  afterAll(() => cleanup.run());

  // ─── helpers ───────────────────────────────────────────────────────

  // El regex del modelo solo acepta letras minúsculas y guion bajo en el recurso,
  // así que se genera una parte única con letras a partir del timestamp.
  // Corrección del equipo: Date.now().toString(36) incluye dígitos (p. ej. "mhvx3k2a")
  // y la key se rechazaba con 400; ahora el timestamp se escribe en base 26 solo con
  // letras y se agregan 4 letras aleatorias por si dos pruebas caen en el mismo milisegundo.
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
  function uniqueResource() {
    let n = Date.now();
    let suffix = '';
    while (n > 0) {
      suffix = LETTERS[n % 26] + suffix;
      n = Math.floor(n / 26);
    }
    for (let i = 0; i < 4; i += 1) suffix += LETTERS[Math.floor(Math.random() * 26)];
    return `eztest_${suffix}`;
  }

  // Si la API aceptara por error un dato inválido (201), el registro se limpia igual
  function trackIfCreated(res) {
    if (res.statusCode === 201 && res.body.data) cleanup.track('/api/permissions', res.body.data.id);
  }

  function makePermission(overrides = {}) {
    return {
      key: `${uniqueResource()}:read:any`,
      description: 'Permiso de prueba E2E',
      ...overrides
    };
  }

  // ─── ciclo completo (admin) ────────────────────────────────────────

  describe('ciclo completo de un permiso (admin)', () => {
    let createdId;
    let permKey;

    it('crear permiso responde 201', async () => {
      const payload = makePermission();
      permKey = payload.key;

      const res = await api()
        .post('/api/permissions')
        .set(adminHeaders)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.key).toBe(payload.key);
      expect(res.body.data.description).toBe(payload.description);

      createdId = res.body.data.id;
      cleanup.track('/api/permissions', createdId);
    });

    it('consultar por id responde 200 con los mismos datos', async () => {
      const res = await api()
        .get(`/api/permissions/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(createdId);
      expect(res.body.data.key).toBe(permKey);
    });

    it('listar permisos responde 200 y el permiso aparece', async () => {
      const res = await api()
        .get('/api/permissions')
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((p) => p.id === createdId);
      expect(found).toBeDefined();
      expect(found.key).toBe(permKey);
    });

    it('actualizar descripción responde 200', async () => {
      const newDescription = 'Descripción actualizada E2E';

      const res = await api()
        .put(`/api/permissions/${createdId}`)
        .set(adminHeaders)
        .send({ description: newDescription });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.description).toBe(newDescription);
      expect(res.body.data.key).toBe(permKey);
    });

    it('eliminar permiso responde 200', async () => {
      const res = await api()
        .delete(`/api/permissions/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
    });

    it('consultar permiso eliminado responde 404', async () => {
      const res = await api()
        .get(`/api/permissions/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── validaciones ──────────────────────────────────────────────────

  describe('validaciones', () => {
    it('crear sin key responde 400', async () => {
      const res = await api()
        .post('/api/permissions')
        .set(adminHeaders)
        .send({ description: 'sin key' });

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('crear con key que no sigue el formato responde 400', async () => {
      const res = await api()
        .post('/api/permissions')
        .set(adminHeaders)
        .send({ key: 'users.read', description: 'formato inválido' });

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('crear con key duplicada (products:read:any) responde 400', async () => {
      const res = await api()
        .post('/api/permissions')
        .set(adminHeaders)
        .send({ key: 'products:read:any', description: 'duplicada' });

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/permissions/abc responde 400', async () => {
      const res = await api()
        .get('/api/permissions/abc')
        .set(adminHeaders);

      expect(res.statusCode).toBe(400);
    });

    it('GET /api/permissions/999999 responde 404', async () => {
      const res = await api()
        .get('/api/permissions/999999')
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── autenticación y autorización ──────────────────────────────────

  describe('autenticación y autorización', () => {
    it('GET /api/permissions sin token responde 401', async () => {
      const res = await api().get('/api/permissions');
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/permissions con rol user responde 403', async () => {
      const userHeaders = await authHeader('user');
      const res = await api()
        .get('/api/permissions')
        .set(userHeaders);

      expect(res.statusCode).toBe(403);
    });
  });
});
