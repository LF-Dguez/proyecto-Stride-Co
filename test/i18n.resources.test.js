// Issue #97: users, roles, permissions y auth responden en es y en, por ?lang=
// y por Accept-Language, con la misma petición. No usa una MongoDB/PostgreSQL
// real: los modelos se simulan, igual que en los demás archivos de prueba.
const request = require('supertest');

jest.mock('../models/sql', () => ({
  User: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Role: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Permission: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() }
}));
const { User, Role, Permission } = require('../models/sql');

const usersRouter = require('../routes/users');
const rolesRouter = require('../routes/roles');
const permissionsRouter = require('../routes/permissions');
const authRouter = require('../routes/auth');
const { buildApp, users } = require('./helpers/rbacApp');
const { hashPassword } = require('../services/password');

const app = buildApp((a) => {
  a.use('/api/users', usersRouter);
  a.use('/api/roles', rolesRouter);
  a.use('/api/permissions', permissionsRouter);
  a.use('/api/auth', authRouter);
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe('i18n en users, roles, permissions y auth (issue #97)', () => {
  it('GET /api/users (200): mismo mensaje, en es y en', async () => {
    User.findAll.mockResolvedValue([]);
    const es = await request(app).get('/api/users').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/users?lang=en').set(users.admin);

    expect(es.body.message).toBe('GET usuarios obtenido exitosamente');
    expect(en.body.message).toBe('GET users retrieved successfully');
  });

  it('GET /api/users/:id inexistente (404): mismo mensaje, en es y en', async () => {
    User.findByPk.mockResolvedValue(null);
    const es = await request(app).get('/api/users/999').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/users/999?lang=en').set(users.admin);

    expect(es.body.message).toBe('Usuario no encontrado');
    expect(en.body.message).toBe('User not found');
  });

  it('POST /api/users sin campos obligatorios (400): mismo mensaje, en es y en', async () => {
    const es = await request(app).post('/api/users').set(users.admin).set('Accept-Language', 'es').send({});
    const en = await request(app).post('/api/users?lang=en').set(users.admin).send({});

    expect(es.body.message).toBe('first_name, last_name y email son obligatorios');
    expect(en.body.message).toBe('first_name, last_name and email are required');
  });

  it('GET /api/roles (200): mismo mensaje, en es y en', async () => {
    Role.findAll.mockResolvedValue([]);
    const es = await request(app).get('/api/roles').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/roles?lang=en').set(users.admin);

    expect(es.body.message).toBe('GET roles obtenido exitosamente');
    expect(en.body.message).toBe('GET roles retrieved successfully');
  });

  it('GET /api/roles/:id inexistente (404): mismo mensaje, en es y en', async () => {
    Role.findByPk.mockResolvedValue(null);
    const es = await request(app).get('/api/roles/999').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/roles/999?lang=en').set(users.admin);

    expect(es.body.message).toBe('Rol no encontrado');
    expect(en.body.message).toBe('Role not found');
  });

  it('POST /api/roles con permission_ids inválido (400): mismo mensaje, en es y en', async () => {
    const body = { name: 'inventory', permission_ids: 'no-es-un-arreglo' };
    const es = await request(app).post('/api/roles').set(users.admin).set('Accept-Language', 'es').send(body);
    const en = await request(app).post('/api/roles?lang=en').set(users.admin).send(body);

    expect(es.body.message).toBe('permission_ids debe ser un arreglo de IDs de permisos');
    expect(en.body.message).toBe('permission_ids must be an array of permission IDs');
  });

  it('GET /api/permissions (200): mismo mensaje, en es y en', async () => {
    Permission.findAll.mockResolvedValue([]);
    const es = await request(app).get('/api/permissions').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/permissions?lang=en').set(users.admin);

    expect(es.body.message).toBe('GET permisos obtenido exitosamente');
    expect(en.body.message).toBe('GET permissions retrieved successfully');
  });

  it('GET /api/permissions/:id inexistente (404): mismo mensaje, en es y en', async () => {
    Permission.findByPk.mockResolvedValue(null);
    const es = await request(app).get('/api/permissions/999').set(users.admin).set('Accept-Language', 'es');
    const en = await request(app).get('/api/permissions/999?lang=en').set(users.admin);

    expect(es.body.message).toBe('Permiso no encontrado');
    expect(en.body.message).toBe('Permission not found');
  });

  it('POST /api/permissions sin key (400): mismo mensaje, en es y en', async () => {
    const es = await request(app).post('/api/permissions').set(users.admin).set('Accept-Language', 'es').send({});
    const en = await request(app).post('/api/permissions?lang=en').set(users.admin).send({});

    expect(es.body.message).toBe('key es obligatoria');
    expect(en.body.message).toBe('key is required');
  });

  it('POST /api/auth/login sin campos (400): mismo mensaje, en es y en', async () => {
    const es = await request(app).post('/api/auth/login').set('Accept-Language', 'es').send({});
    const en = await request(app).post('/api/auth/login?lang=en').send({});

    expect(es.body.message).toBe('email y password son obligatorios');
    expect(en.body.message).toBe('email and password are required');
  });

  it('POST /api/auth/login correcto (200): mismo mensaje, en es y en', async () => {
    const { password_hash, salt_key } = await hashPassword('Secret123');
    const fakeUser = {
      id: 1, email: 'ana@stride.co', active: true, password_hash, salt_key,
      toJSON() { return { id: this.id, email: this.email }; }
    };
    User.findOne = jest.fn().mockResolvedValue(fakeUser);

    const credentials = { email: fakeUser.email, password: 'Secret123' };
    const es = await request(app).post('/api/auth/login').set('Accept-Language', 'es').send(credentials);
    const en = await request(app).post('/api/auth/login?lang=en').send(credentials);

    expect(es.body.message).toBe('Login exitoso');
    expect(en.body.message).toBe('Login successful');
  });
});
