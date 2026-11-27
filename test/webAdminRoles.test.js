// F14: roles y permisos (checkboxes por recurso, RBAC se recarga sin reiniciar) con RBAC real.
const request = require('supertest');

jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Role: { findAll: jest.fn(), findByPk: jest.fn() },
  Permission: { findAll: jest.fn() }
}));
jest.mock('../models/mongo', () => ({ Order: { countDocuments: jest.fn().mockResolvedValue(0) }, Customer: {} }));
jest.mock('../services/order.service', () => ({
  STATUSES: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  listRecent: jest.fn().mockResolvedValue([])
}));
jest.mock('../services/rbac', () => {
  const actual = jest.requireActual('../services/rbac');
  return { ...actual, loadAccessControl: jest.fn().mockResolvedValue() };
});

const { User, Role, Permission } = require('../models/sql');
const rbac = require('../services/rbac');
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
  return agent;
}

function fakeRole(overrides = {}) {
  return {
    id: 2, name: 'sales', description: 'Vendedor',
    permissions: [{ id: 1, key: 'products:read:any' }],
    setPermissions: jest.fn().mockResolvedValue(),
    ...overrides
  };
}

beforeAll(() => {
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 1: 'admin', 2: 'sales' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('F14: listado y RBAC (roles:*:any es solo de admin)', () => {
  it('ADMIN ve el listado de roles con su conteo de permisos', async () => {
    Role.findAll.mockResolvedValue([fakeRole()]);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/roles');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('sales');
    expect(res.text).toContain('Vendedor');
  });

  it('SALES no puede ver el panel de roles (403)', async () => {
    const agent = await loginAgent('sales');
    const res = await agent.get('/admin/roles');
    expect(res.statusCode).toBe(403);
  });
});

describe('F14: editar permisos de un rol', () => {
  it('muestra los permisos agrupados por recurso, marcados según el rol', async () => {
    Role.findByPk.mockResolvedValue(fakeRole());
    Permission.findAll.mockResolvedValue([
      { id: 1, key: 'products:read:any' },
      { id: 2, key: 'products:create:any' },
      { id: 3, key: 'orders:read:any' }
    ]);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/roles/2/edit');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('products');
    expect(res.text).toContain('orders');
    expect(res.text).toMatch(/id="perm-1"[^>]*checked/);
  });

  it('rol inexistente responde 404', async () => {
    Role.findByPk.mockResolvedValue(null);
    const agent = await loginAgent('admin');
    const res = await agent.get('/admin/roles/999/edit');
    expect(res.statusCode).toBe(404);
  });

  it('POST actualiza los permisos y recarga el RBAC sin reiniciar el servidor', async () => {
    const role = fakeRole();
    Role.findByPk.mockResolvedValue(role);
    Permission.findAll.mockResolvedValue([{ id: 1, key: 'products:read:any' }, { id: 3, key: 'orders:read:any' }]);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/roles/2').send({ permission_ids: ['1', '3'] });
    expect(res.statusCode).toBe(302);
    expect(role.setPermissions).toHaveBeenCalled();
    expect(rbac.loadAccessControl).toHaveBeenCalled();
  });

  it('sin ningún permiso marcado, el rol se queda sin permisos (no falla)', async () => {
    const role = fakeRole();
    Role.findByPk.mockResolvedValue(role);
    const agent = await loginAgent('admin');
    const res = await agent.post('/admin/roles/2').send({});
    expect(res.statusCode).toBe(302);
    expect(role.setPermissions).toHaveBeenCalledWith([]);
  });

  it('SALES no puede cambiar permisos (403)', async () => {
    const agent = await loginAgent('sales');
    const res = await agent.post('/admin/roles/2').send({ permission_ids: ['1'] });
    expect(res.statusCode).toBe(403);
  });
});
