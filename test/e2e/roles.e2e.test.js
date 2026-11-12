const { api, authHeader, createCleanup } = require('./helpers');

describe('Roles (E2E)', () => {
  const cleanup = createCleanup();
  let adminHeaders;
  let permIdA; // products:read:any
  let permIdB; // variants:read:any

  beforeAll(async () => {
    adminHeaders = await authHeader('admin');

    // Buscar ids de permisos por key, no fijos
    const permsRes = await api()
      .get('/api/permissions')
      .set(adminHeaders);
    expect(permsRes.statusCode).toBe(200);

    const perms = permsRes.body.data;
    const permA = perms.find((p) => p.key === 'products:read:any');
    const permB = perms.find((p) => p.key === 'variants:read:any');
    expect(permA).toBeDefined();
    expect(permB).toBeDefined();
    permIdA = permA.id;
    permIdB = permB.id;
  });

  afterAll(() => cleanup.run());

  // ─── helpers ───────────────────────────────────────────────────────

  // Date.now() + sufijo aleatorio: dos roles creados en el mismo milisegundo
  // no deben compartir nombre (corrección del equipo)
  const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Si la API aceptara por error un dato inválido (201), el registro se limpia igual
  function trackIfCreated(res) {
    if (res.statusCode === 201 && res.body.data) cleanup.track('/api/roles', res.body.data.id);
  }

  function makeRole(overrides = {}) {
    return {
      name: `e2e-role-${unique()}`,
      description: 'Rol de prueba E2E',
      ...overrides
    };
  }

  // ─── ciclo completo (admin) ────────────────────────────────────────

  describe('ciclo completo de un rol (admin)', () => {
    let createdId;
    let roleName;

    it('crear rol con permission_ids responde 201', async () => {
      const payload = { ...makeRole(), permission_ids: [permIdA] };
      roleName = payload.name;

      const res = await api()
        .post('/api/roles')
        .set(adminHeaders)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data.description).toBe(payload.description);
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.some((p) => p.id === permIdA)).toBe(true);

      createdId = res.body.data.id;
      cleanup.track('/api/roles', createdId);
    });

    it('consultar por id responde 200 e incluye permisos', async () => {
      const res = await api()
        .get(`/api/roles/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(createdId);
      expect(res.body.data.name).toBe(roleName);
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.some((p) => p.id === permIdA)).toBe(true);
    });

    it('listar roles responde 200 y el rol aparece', async () => {
      const res = await api()
        .get('/api/roles')
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((r) => r.id === createdId);
      expect(found).toBeDefined();
      expect(found.name).toBe(roleName);
    });

    it('actualizar descripción y cambiar permission_ids responde 200', async () => {
      const newDescription = 'Descripción actualizada E2E';

      const res = await api()
        .put(`/api/roles/${createdId}`)
        .set(adminHeaders)
        .send({ description: newDescription, permission_ids: [permIdB] });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.description).toBe(newDescription);
      expect(Array.isArray(res.body.data.permissions)).toBe(true);

      // permIdA ya no debe estar, permIdB sí
      const permIds = res.body.data.permissions.map((p) => p.id);
      expect(permIds).toContain(permIdB);
      expect(permIds).not.toContain(permIdA);
    });

    it('eliminar rol responde 200', async () => {
      const res = await api()
        .delete(`/api/roles/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(200);
    });

    it('consultar rol eliminado responde 404', async () => {
      const res = await api()
        .get(`/api/roles/${createdId}`)
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── validaciones ──────────────────────────────────────────────────

  describe('validaciones', () => {
    it('crear con nombre duplicado (admin) responde 400', async () => {
      const res = await api()
        .post('/api/roles')
        .set(adminHeaders)
        .send({ name: 'admin', description: 'duplicado' });

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('crear con permission_ids inexistentes responde 400', async () => {
      const res = await api()
        .post('/api/roles')
        .set(adminHeaders)
        .send(makeRole({ permission_ids: [999999] }));

      trackIfCreated(res);
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/roles/abc responde 400', async () => {
      const res = await api()
        .get('/api/roles/abc')
        .set(adminHeaders);

      expect(res.statusCode).toBe(400);
    });

    it('GET /api/roles/999999 responde 404', async () => {
      const res = await api()
        .get('/api/roles/999999')
        .set(adminHeaders);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── autenticación y autorización ──────────────────────────────────

  describe('autenticación y autorización', () => {
    it('GET /api/roles sin token responde 401', async () => {
      const res = await api().get('/api/roles');
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/roles con rol sales responde 403', async () => {
      const salesHeaders = await authHeader('sales');
      const res = await api()
        .get('/api/roles')
        .set(salesHeaders);

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── regla de negocio: no eliminar rol con usuarios ────────────────

  describe('eliminar rol con usuarios asignados', () => {
    it('responde 409 si el rol tiene usuarios', async () => {
      // 1. Crear un rol nuevo
      const rolePayload = makeRole();
      const roleRes = await api()
        .post('/api/roles')
        .set(adminHeaders)
        .send(rolePayload);

      expect(roleRes.statusCode).toBe(201);
      const roleId = roleRes.body.data.id;
      cleanup.track('/api/roles', roleId);

      // 2. Crear un usuario asignado a ese rol
      const userRes = await api()
        .post('/api/users')
        .set(adminHeaders)
        .send({
          first_name: 'RolTest',
          last_name: 'User',
          email: `e2e-role-user-${unique()}@stride.co`,
          password: 'E2E-RoleUser-2026!',
          role_id: roleId
        });

      expect(userRes.statusCode).toBe(201);
      // Registrar el usuario DESPUÉS del rol → cleanup borra usuario primero, rol después
      cleanup.track('/api/users', userRes.body.data.id);

      // 3. Intentar eliminar el rol → 409
      const deleteRes = await api()
        .delete(`/api/roles/${roleId}`)
        .set(adminHeaders);

      expect(deleteRes.statusCode).toBe(409);
    });
  });
});
