// F1: inicio y cierre de sesión (login real -> cookie real -> authenticate/authorize
// con el rol real). Los modelos se simulan (sin PostgreSQL), igual que en
// test/auth.integration.test.js.
const request = require('supertest');

jest.mock('../models/sql', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() }
}));
const { User } = require('../models/sql');
const { hashPassword } = require('../services/password');
const { buildAccessControl, setAccessControl } = require('../services/rbac');
const { ROLE_PERMISSIONS } = require('../seeders/rbacMatrix');

const app = require('../app');

const ROLE_ID = { admin: 1, sales: 2, user: 3 };

async function seedUser(role, overrides = {}) {
  const { password_hash, salt_key } = await hashPassword('Secret123');
  const data = {
    id: ROLE_ID[role],
    first_name: 'Prueba',
    last_name: role,
    email: `${role}@stride.co`,
    role_id: ROLE_ID[role],
    active: true,
    password_hash,
    salt_key,
    ...overrides
  };
  return {
    ...data,
    toJSON() {
      const { password_hash: _ph, salt_key: _sk, ...safe } = this; // eslint-disable-line no-unused-vars
      return safe;
    }
  };
}

beforeAll(() => {
  const permissionRows = Object.entries(ROLE_PERMISSIONS)
    .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));
  setAccessControl(buildAccessControl(permissionRows), { 1: 'admin', 2: 'sales', 3: 'user' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('F1: formulario de inicio de sesión', () => {
  it('GET /login responde 200 con el formulario', async () => {
    const res = await request(app).get('/login');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('<form');
    expect(res.text).toContain('name="email"');
    expect(res.text).toContain('name="password"');
  });

  it('GET /login conserva el next recibido en un campo oculto', async () => {
    const res = await request(app).get('/login?next=%2Fadmin');
    expect(res.text).toContain('value="/admin"');
  });

  it('POST /login sin email ni password responde 400 con el mismo formulario y el error', async () => {
    const res = await request(app).post('/login').send({});
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('<form');
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('POST /login con credenciales incorrectas responde 400 con el mensaje genérico', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post('/login').send({ email: 'no-existe@stride.co', password: 'cualquiera' });
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('Credenciales Inválidas');
  });

  it('POST /login con usuario inactivo responde 400 con el mismo mensaje genérico', async () => {
    const user = await seedUser('admin', { active: false });
    User.findOne.mockResolvedValue(user);
    const res = await request(app).post('/login').send({ email: user.email, password: 'Secret123' });
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('Credenciales Inválidas');
  });

  it('POST /login válido pone la cookie access_token y redirige a / por defecto', async () => {
    const user = await seedUser('admin');
    User.findOne.mockResolvedValue(user);
    const res = await request(app).post('/login').send({ email: user.email, password: 'Secret123' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/');
    expect(res.headers['set-cookie'].some((c) => c.startsWith('access_token='))).toBe(true);
  });

  it('POST /login válido con next redirige ahí en vez de /', async () => {
    const user = await seedUser('admin');
    User.findOne.mockResolvedValue(user);
    const res = await request(app).post('/login').send({ email: user.email, password: 'Secret123', next: '/admin' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/admin');
  });

  it('POST /login ignora un next externo (open redirect) y manda a /', async () => {
    const user = await seedUser('admin');
    User.findOne.mockResolvedValue(user);
    const res = await request(app).post('/login').send({ email: user.email, password: 'Secret123', next: '//evil.com' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('el formulario se traduce en es y en', async () => {
    const es = await request(app).get('/login').set('Accept-Language', 'es');
    const en = await request(app).get('/login?lang=en');
    expect(es.text).toContain('Iniciar sesión');
    expect(en.text).toContain('Log in');
  });

  it('el HTML nunca contiene password_hash ni salt_key', async () => {
    const user = await seedUser('admin');
    User.findOne.mockResolvedValue(user);
    const res = await request(app).post('/login').send({ email: user.email, password: 'contraseña-mala' });
    expect(res.text).not.toContain('password_hash');
    expect(res.text).not.toContain('salt_key');
  });
});

describe('F1: ruta protegida (/admin) y cierre de sesión', () => {
  it('GET /admin sin sesión redirige (302) a /login conservando la ruta pedida', async () => {
    const res = await request(app).get('/admin');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login?next=%2Fadmin');
  });

  it('flujo completo: login -> página protegida -> logout -> la misma página vuelve a redirigir', async () => {
    const admin = await seedUser('admin');
    User.findOne.mockResolvedValue(admin);
    User.findByPk.mockResolvedValue(admin);

    const agent = request.agent(app);
    const login = await agent.post('/login').send({ email: admin.email, password: 'Secret123' });
    expect(login.statusCode).toBe(302);

    const dashboard = await agent.get('/admin');
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.text).toContain('Prueba');

    const logout = await agent.post('/logout');
    expect(logout.statusCode).toBe(302);
    expect(logout.headers.location).toBe('/');

    const again = await agent.get('/admin');
    expect(again.statusCode).toBe(302);
    expect(again.headers.location).toBe('/login?next=%2Fadmin');
  });

  it('USER (cliente, sin orders:read:any) recibe 403 en /admin', async () => {
    const user = await seedUser('user');
    User.findOne.mockResolvedValue(user);
    User.findByPk.mockResolvedValue(user);

    const agent = request.agent(app);
    await agent.post('/login').send({ email: user.email, password: 'Secret123' });
    const res = await agent.get('/admin');

    expect(res.statusCode).toBe(403);
  });
});
