const { api, authHeader, createCleanup } = require('./helpers');

describe('Usuarios (E2E)', () => {
  const cleanup = createCleanup();
  let adminHeaders;
  let userRoleId;

  beforeAll(async () => {
    adminHeaders = await authHeader('admin');

    // Buscar el role_id del rol "user" por nombre, no fijo
    const rolesRes = await api()
      .get('/api/roles')
      .set(adminHeaders);
    expect(rolesRes.statusCode).toBe(200);

    const userRole = rolesRes.body.data.find((r) => r.name === 'user');
    expect(userRole).toBeDefined();
    userRoleId = userRole.id;
  });

  afterAll(() => cleanup.run());

  // ─── helpers ───────────────────────────────────────────────────────

  const SENSITIVE_FIELDS = ['password', 'password_hash', 'salt_key'];

  function expectNoSensitiveFields(obj) {
    SENSITIVE_FIELDS.forEach((field) => {
      expect(obj).not.toHaveProperty(field);
    });
  }

  // Date.now() + sufijo aleatorio: dos usuarios creados en el mismo milisegundo
  // no deben compartir email (corrección del equipo)
  const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Si la API aceptara por error un dato inválido (201), el registro se limpia igual
  function trackIfCreated(res) {
    if (res.statusCode === 201 && res.body.data) cleanup.track('/api/users', res.body.data.id);
  }

  function makeUser(overrides = {}) {
    return {
      first_name: 'Test',
      last_name: 'User',
      email: `e2e-user-${unique()}@stride.co`,
      password: 'E2E-Password-2026!',
      role_id: userRoleId,
      ...overrides
    };
  }

  // ─── ciclo completo (admin) ────────────────────────────────────────

  describe('ciclo completo de un usuario (admin)', () => {
    const userData = {};
    let createdId;

    it('crear usuario responde 201', async () => {
      const payload = makeUser();
      Object.assign(userData, payload);

      const res = await api()
        .post('/api/users')
        .set(adminHeaders)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.first_name).toBe(payload.first_name);
      expect(res.body.data.last_name).toBe(payload.last_name);
      expect(res.body.data.email).toBe(payload.email);
      expectNoSensitiveFields(res.body.data);

      createdId = res.body.data.id;
      cleanup.track('/api/users', createdId);
    });

    it('consultar por id responde 200 con los mismos datos', async () => {
      const res = await api()
        .get(`/api/users/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(createdId);
      expect(res.body.data.first_name).toBe(userData.first_name);
      expect(res.body.data.last_name).toBe(userData.last_name);
      expect(res.body.data.email).toBe(userData.email);
      expectNoSensitiveFields(res.body.data);
    });

    it('listar usuarios responde 200 y el usuario creado aparece', async () => {
      const res = await api()
        .get('/api/users')
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((u) => u.id === createdId);
      expect(found).toBeDefined();
      expect(found.email).toBe(userData.email);
      expectNoSensitiveFields(found);
    });

    it('actualizar first_name responde 200 y el cambio se aplica', async () => {
      const newName = 'Actualizado';

      const res = await api()
        .put(`/api/users/${createdId}`)
        .set(adminHeaders)
        .send({ first_name: newName });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.first_name).toBe(newName);
      expectNoSensitiveFields(res.body.data);

      // Verificar que el cambio persiste
      const getRes = await api()
        .get(`/api/users/${createdId}`)
        .set(adminHeaders);
      expect(getRes.body.data.first_name).toBe(newName);
    });

    it('eliminar usuario responde 200', async () => {
      const res = await api()
        .delete(`/api/users/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
    });

    it('consultar usuario eliminado responde 404', async () => {
      const res = await api()
        .get(`/api/users/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── validaciones ──────────────────────────────────────────────────

  describe('validaciones', () => {
    it('crear con email mal formado responde 400', async () => {
      const res = await api()
        .post('/api/users')
        .set(adminHeaders)
        .send(makeUser({ email: 'no-es-un-email' }));

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('crear sin first_name responde 400', async () => {
      const payload = makeUser();
      delete payload.first_name;

      const res = await api()
        .post('/api/users')
        .set(adminHeaders)
        .send(payload);

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('crear con un email que ya existe responde 400', async () => {
      const payload = makeUser();

      const first = await api()
        .post('/api/users')
        .set(adminHeaders)
        .send(payload);
      expect(first.statusCode).toBe(201);
      cleanup.track('/api/users', first.body.data.id);

      const duplicate = await api()
        .post('/api/users')
        .set(adminHeaders)
        .send(payload);
      trackIfCreated(duplicate);
      expect(duplicate.statusCode).toBe(400);
    });

    it('GET /api/users/abc responde 400', async () => {
      const res = await api()
        .get('/api/users/abc')
        .set(adminHeaders);

      expect(res.statusCode).toBe(400);
    });

    it('GET /api/users/999999 responde 404', async () => {
      const res = await api()
        .get('/api/users/999999')
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── autenticación y autorización ──────────────────────────────────

  describe('autenticación y autorización', () => {
    it('GET /api/users sin token responde 401', async () => {
      const res = await api().get('/api/users');
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/users con rol sales responde 403', async () => {
      const salesHeaders = await authHeader('sales');
      const res = await api()
        .get('/api/users')
        .set(salesHeaders);

      expect(res.statusCode).toBe(403);
    });
  });
});
