const request = require('supertest');

jest.mock('../models/relationals', () => {
  const { mockModel } = require('./helpers/sequelizeMocks');
  return { Permission: mockModel() };
});
const { Permission } = require('../models/relationals');
const rbac = require('../services/rbac');
const { mockInstance, sequelizeError } = require('./helpers/sequelizeMocks');
const app = require('../app');
const permissionsRouter = require('../routes/permissions');
const { buildApp, users } = require('./helpers/rbacApp');

// Permissions está protegido con RBAC: solo admin tiene permissions:*:any.
const protectedApp = buildApp((a) => a.use('/api/permissions', permissionsRouter));

const permiso = { id: 1, key: 'products:read:any', description: 'Ver el catálogo' };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(rbac, 'loadAccessControl').mockResolvedValue();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Autorización de /api/permissions', () => {
  it('sin usuario autenticado responde 401', async () => {
    const response = await request(protectedApp).get('/api/permissions');
    expect(response.statusCode).toBe(401);
  });

  it('un rol sin permiso (sales) responde 403 sin consultar la base de datos', async () => {
    const response = await request(protectedApp).get('/api/permissions').set(users.sales);
    expect(response.statusCode).toBe(403);
    expect(Permission.findAll).not.toHaveBeenCalled();
  });

  it('GET a una subruta inexistente de /api/permissions, sin token, responde 401', async () => {
    const response = await request(app).get('/api/permissions/1/inexistente');
    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});

describe('API de Permissions (como admin, MySQL con Sequelize)', () => {
  it('GET /api/permissions responde 200 con los permisos de la base de datos', async () => {
    Permission.findAll.mockResolvedValue([permiso]);
    const response = await request(protectedApp).get('/api/permissions').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual([permiso]);
  });

  it('GET /api/permissions/:id responde 404 si no existe', async () => {
    Permission.findByPk.mockResolvedValue(null);
    const response = await request(protectedApp).get('/api/permissions/999').set(users.admin);
    expect(response.statusCode).toBe(404);
  });

  it('POST /api/permissions crea un permiso con key recurso:accion:alcance', async () => {
    Permission.create.mockImplementation(async (data) => ({ id: 37, ...data }));
    const response = await request(protectedApp)
      .post('/api/permissions')
      .set(users.admin)
      .send({ key: 'users:read:own', description: 'Ver su propio usuario' });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.key).toBe('users:read:own');
  });

  it('POST /api/permissions con una key fuera de la convención responde 400', async () => {
    const response = await request(protectedApp)
      .post('/api/permissions')
      .set(users.admin)
      .send({ key: 'users.read' });

    expect(response.statusCode).toBe(400);
    expect(Permission.create).not.toHaveBeenCalled();
  });

  it('POST /api/permissions sin key responde 400', async () => {
    const response = await request(protectedApp).post('/api/permissions').set(users.admin).send({ description: 'x' });
    expect(response.statusCode).toBe(400);
  });

  it('POST /api/permissions con una key repetida responde 409', async () => {
    Permission.create.mockRejectedValue(sequelizeError('SequelizeUniqueConstraintError'));
    const response = await request(protectedApp).post('/api/permissions').set(users.admin).send({ key: 'products:read:any' });
    expect(response.statusCode).toBe(409);
  });

  it('PUT /api/permissions/:id actualiza y recarga los permisos en memoria', async () => {
    const instancia = mockInstance(permiso);
    Permission.findByPk.mockResolvedValue(instancia);
    const response = await request(protectedApp)
      .put('/api/permissions/1')
      .set(users.admin)
      .send({ description: 'Consultar productos' });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.description).toBe('Consultar productos');
    expect(rbac.loadAccessControl).toHaveBeenCalled();
  });

  it('DELETE /api/permissions/:id elimina y recarga los permisos en memoria', async () => {
    const instancia = mockInstance(permiso);
    Permission.findByPk.mockResolvedValue(instancia);
    const response = await request(protectedApp).delete('/api/permissions/1').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(instancia.destroy).toHaveBeenCalled();
    expect(rbac.loadAccessControl).toHaveBeenCalled();
  });
});
