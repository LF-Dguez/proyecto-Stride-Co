const request = require('supertest');

jest.mock('../models/relationals', () => {
  const { mockModel } = require('./helpers/sequelizeMocks');
  return { Role: mockModel(), Permission: mockModel(), User: { count: jest.fn() } };
});
const { Role, Permission, User } = require('../models/relationals');
const rbac = require('../services/rbac');
const { mockInstance, sequelizeError } = require('./helpers/sequelizeMocks');
const app = require('../app');
const rolesRouter = require('../routes/roles');
const { buildApp, users } = require('./helpers/rbacApp');

// Roles está protegido con RBAC: solo admin tiene roles:*:any.
const protectedApp = buildApp((a) => a.use('/api/roles', rolesRouter));

const permisos = [{ id: 1, key: 'products:read:any' }, { id: 2, key: 'orders:read:own' }];
const rol = { id: 4, name: 'inventory', description: 'Encargado de inventario', permissions: [] };

function roleInstance(data = rol) {
  return Object.assign(mockInstance(data), { setPermissions: jest.fn(async () => {}) });
}

beforeEach(() => {
  jest.resetAllMocks();
  // Se simula la recarga desde la BD para no reemplazar la matriz que carga buildApp()
  jest.spyOn(rbac, 'loadAccessControl').mockResolvedValue();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Autorización de /api/roles', () => {
  it('sin usuario autenticado responde 401', async () => {
    const response = await request(protectedApp).get('/api/roles');
    expect(response.statusCode).toBe(401);
  });

  it('un rol sin permiso (user) responde 403 sin consultar la base de datos', async () => {
    const response = await request(protectedApp).get('/api/roles').set(users.user);
    expect(response.statusCode).toBe(403);
    expect(response.body.error.status).toBe(403);
    expect(Role.findAll).not.toHaveBeenCalled();
  });

  it('GET a una subruta inexistente de /api/roles, sin token, responde 401', async () => {
    // authenticate protege todo el prefijo /api/roles en la app real.
    const response = await request(app).get('/api/roles/1/inexistente');
    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});

describe('API de Roles (como admin, MySQL con Sequelize)', () => {
  it('GET /api/roles responde 200 con los roles y sus permisos', async () => {
    Role.findAll.mockResolvedValue([{ ...rol, permissions: permisos }]);
    const response = await request(protectedApp).get('/api/roles').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data[0].permissions).toHaveLength(2);
  });

  it('GET /api/roles/:id responde 404 si no existe', async () => {
    Role.findByPk.mockResolvedValue(null);
    const response = await request(protectedApp).get('/api/roles/999').set(users.admin);
    expect(response.statusCode).toBe(404);
  });

  it('POST /api/roles crea el rol, asigna permission_ids y recarga los permisos', async () => {
    const instancia = roleInstance();
    Permission.findAll.mockResolvedValue(permisos);
    Role.create.mockResolvedValue(instancia);
    Role.findByPk.mockResolvedValue({ ...rol, permissions: permisos });

    const response = await request(protectedApp)
      .post('/api/roles')
      .set(users.admin)
      .send({ name: 'inventory', description: 'Encargado de inventario', permission_ids: [1, 2] });

    expect(response.statusCode).toBe(201);
    expect(instancia.setPermissions).toHaveBeenCalledWith(permisos);
    expect(rbac.loadAccessControl).toHaveBeenCalled();
    expect(response.body.data.permissions).toHaveLength(2);
  });

  it('POST /api/roles con un permiso inexistente responde 400 y no crea el rol', async () => {
    Permission.findAll.mockResolvedValue([permisos[0]]);
    const response = await request(protectedApp)
      .post('/api/roles')
      .set(users.admin)
      .send({ name: 'inventory', permission_ids: [1, 99] });

    expect(response.statusCode).toBe(400);
    expect(Role.create).not.toHaveBeenCalled();
  });

  it('POST /api/roles con un nombre repetido responde 409', async () => {
    Role.create.mockRejectedValue(sequelizeError('SequelizeUniqueConstraintError'));
    const response = await request(protectedApp).post('/api/roles').set(users.admin).send({ name: 'admin' });
    expect(response.statusCode).toBe(409);
  });

  it('PUT /api/roles/:id actualiza la descripción y recarga los permisos', async () => {
    const instancia = roleInstance();
    Role.findByPk.mockResolvedValueOnce(instancia).mockResolvedValueOnce({ ...rol, description: 'Almacén' });

    const response = await request(protectedApp).put('/api/roles/4').set(users.admin).send({ description: 'Almacén' });

    expect(response.statusCode).toBe(200);
    expect(instancia.update).toHaveBeenCalledWith({ description: 'Almacén' });
    expect(response.body.data.description).toBe('Almacén');
    expect(rbac.loadAccessControl).toHaveBeenCalled();
  });

  it('PUT /api/roles/:id con permission_ids reemplaza los permisos del rol', async () => {
    const instancia = roleInstance();
    Role.findByPk.mockResolvedValueOnce(instancia).mockResolvedValueOnce({ ...rol, permissions: [permisos[1]] });
    Permission.findAll.mockResolvedValue([permisos[1]]);

    const response = await request(protectedApp).put('/api/roles/4').set(users.admin).send({ permission_ids: [2] });

    expect(response.statusCode).toBe(200);
    expect(instancia.setPermissions).toHaveBeenCalledWith([permisos[1]]);
    expect(instancia.update).not.toHaveBeenCalled();
  });

  it('DELETE /api/roles/:id elimina un rol sin usuarios y recarga los permisos', async () => {
    const instancia = roleInstance();
    Role.findByPk.mockResolvedValue(instancia);
    User.count.mockResolvedValue(0);

    const response = await request(protectedApp).delete('/api/roles/4').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(instancia.destroy).toHaveBeenCalled();
    expect(rbac.loadAccessControl).toHaveBeenCalled();
  });

  it('DELETE /api/roles/:id con usuarios asignados responde 409', async () => {
    const instancia = roleInstance();
    Role.findByPk.mockResolvedValue(instancia);
    User.count.mockResolvedValue(3);

    const response = await request(protectedApp).delete('/api/roles/1').set(users.admin);

    expect(response.statusCode).toBe(409);
    expect(instancia.destroy).not.toHaveBeenCalled();
  });
});
