// F13: usuarios internos (listar, crear, editar, activar/desactivar) con RBAC real.
const request = require('supertest');

jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  Role: { findAll: jest.fn() }
}));
jest.mock('../models/mongo', () => ({ Order: { countDocuments: jest.fn().mockResolvedValue(0) }, Customer: {} }));
jest.mock('../services/order.service', () => ({
  STATUSES: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  listRecent: jest.fn().mockResolvedValue([])
}));

const { User, Role } = require('../models/sql');
const { hashPassword } = require('../services/password');
const { buildAccessControl, setAccessControl } = require('../services/rbac');
const { ROLE_PERMISSIONS } = require('../seeders/rbacMatrix');

const app = require('../app');

const ROLE_ID = { admin: 1, sales: 2 };

async function seedUser(role) {
  const { password_hash, salt_key } = await hashPassword('Secret123');
  const data = {
    id: ROLE_ID[role], first_name: 'Prueba', last_name: role, email: `${role}@stride.co`,
    role_id: ROLE_ID[role], active: true, password_hash, salt_key
  };
  return { ...data, toJSON() { const { password_hash: _ph, salt_key: _sk, ...safe } = this; return safe; } }; // eslint-disable-line no-unused-vars
}

async function loginAgent(role) {
  const user = await seedUser(role);
  User.findOne.mockResolvedValue(user);
  User.findByPk.mockResolvedValue(user);
  const agent = request.agent(app);
  await agent.post('/login').send({ email: user.email, password: 'Secret123' });
  agent.__sessionUser = user;
  return agent;
}

function fakeUserRow(overrides = {}) {
  return {
    id: 5, first_name: 'Ana', last_name: 'Lopez', email: 'ana@stride.co', role_id: 2, active: true,
    role: { name: 'sales', description: 'Vendedor' },
    update: jest.fn(function update(fields) { Object.assign(this, fields); return Promise.resolve(this); }),
    ...overrides
  };
}

beforeAll(() => {
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 1: 'admin', 2: 'sales' });
  Role.findAll.mockResolvedValue([{ id: 1, name: 'admin', description: 'Administrador' }, { id: 2, name: 'sales', description: 'Vendedor' }]);
});

beforeEach(() => {
  jest.clearAllMocks();
  Role.findAll.mockResolvedValue([{ id: 1, name: 'admin', description: 'Administrador' }, { id: 2, name: 'sales', description: 'Vendedor' }]);
});

describe('F13: listado y RBAC (users:*:any es solo de admin)', () => {
  it('ADMIN ve el listado con botón de nuevo usuario', async () => {
    User.findAll.mockResolvedValue([fakeUserRow()]);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/users');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Ana Lopez');
    expect(res.text).toContain('Nuevo usuario');
  });

  it('SALES no puede ver el panel de usuarios (403)', async () => {
    const agent = await loginAgent('sales');
    const res = await agent.get('/admin/users');
    expect(res.statusCode).toBe(403);
  });
});

describe('F13: crear usuario', () => {
  it('sin contraseña (o muy corta) responde 400', async () => {
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/users').send({ first_name: 'Ana', last_name: 'Lopez', email: 'ana@stride.co', role_id: '2', password: '123' });
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('obligatoria');
    expect(User.create).not.toHaveBeenCalled();
  });

  it('válido crea el usuario (hash, nunca la contraseña en texto plano) y redirige', async () => {
    User.create.mockResolvedValue(fakeUserRow());
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/users').send({ first_name: 'Ana', last_name: 'Lopez', email: 'ana@stride.co', role_id: '2', password: 'Secret123' });
    expect(res.statusCode).toBe(302);
    const [args] = User.create.mock.calls[0];
    expect(args.password_hash).toBeDefined();
    expect(args.password).toBeUndefined();
  });

  it('email repetido responde 400 en vez de 500', async () => {
    const dupError = new Error('duplicate');
    dupError.name = 'SequelizeUniqueConstraintError';
    User.create.mockRejectedValue(dupError);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/users').send({ first_name: 'Ana', last_name: 'Lopez', email: 'ana@stride.co', role_id: '2', password: 'Secret123' });
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('ya está registrado');
  });
});

describe('F13: editar, activar/desactivar y datos seguros', () => {
  it('editar sin contraseña nueva conserva el hash anterior', async () => {
    const agent = await loginAgent('admin');
    const user = fakeUserRow();
    User.findByPk.mockImplementation((id) => Promise.resolve(Number(id) === 5 ? user : agent.__sessionUser));
    const res = await agent.post('/admin/users/5').send({ first_name: 'Ana', last_name: 'Lopez', email: 'ana@stride.co', role_id: '2' });
    expect(res.statusCode).toBe(302);
    expect(user.update).toHaveBeenCalledWith(expect.not.objectContaining({ password_hash: expect.anything() }));
  });

  it('POST /admin/users/:id/delete activa/desactiva', async () => {
    const agent = await loginAgent('admin');
    const user = fakeUserRow({ active: true });
    User.findByPk.mockImplementation((id) => Promise.resolve(Number(id) === 5 ? user : agent.__sessionUser));
    const res = await agent.post('/admin/users/5/delete');
    expect(res.statusCode).toBe(302);
    expect(user.update).toHaveBeenCalledWith({ active: false });
  });

  it('el HTML de la lista nunca contiene password_hash ni salt_key', async () => {
    User.findAll.mockResolvedValue([fakeUserRow()]);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/users');
    expect(res.text).not.toContain('password_hash');
    expect(res.text).not.toContain('salt_key');
  });
});
