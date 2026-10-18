process.env.BCRYPT_SALT_ROUNDS = '4';

const request = require('supertest');
const app = require('../app');
const usersRouter = require('../routes/users');
const { buildApp, users } = require('./helpers/rbacApp');
const { verifyPassword } = require('../services/password');

jest.mock('../models/relationals', () => ({
  User: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  }
}));
const { User } = require('../models/relationals');

const protectedApp = buildApp((a) => a.use('/api/users', usersRouter));

const SENSITIVE_FIELDS = ['password', 'password_hash', 'salt_key'];

function fakeUser(overrides = {}) {
  const data = {
    id: 1,
    first_name: 'Ana',
    last_name: 'Lopez',
    email: 'ana@stride.com',
    role_id: 2,
    active: true,
    password_hash: '$2b$04$hashAnteriorDeEjemplo',
    salt_key: '$2b$04$saltAnteriorDeEjemplo',
    ...overrides
  };
  return {
    data,
    update: jest.fn(async (changes) => { Object.assign(data, changes); }),
    destroy: jest.fn(async () => {}),
    toJSON: () => Object.fromEntries(
      Object.entries(data).filter(([key]) => !SENSITIVE_FIELDS.includes(key))
    )
  };
}

function expectNoSensitiveFields(body) {
  const text = JSON.stringify(body);
  SENSITIVE_FIELDS.forEach((field) => expect(text).not.toContain(`"${field}"`));
}

const nuevoUsuario = {
  first_name: 'Ana',
  last_name: 'Lopez',
  email: 'ana@stride.com',
  role_id: 2,
  password: 'Secret123'
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Autorización de /api/users', () => {
  it('sin usuario autenticado responde 401', async () => {
    const response = await request(protectedApp).get('/api/users');
    expect(response.statusCode).toBe(401);
  });

  it('un rol sin permiso (sales) responde 403', async () => {
    const response = await request(protectedApp).get('/api/users').set(users.sales);
    expect(response.statusCode).toBe(403);
    expect(response.body.error.status).toBe(403);
  });
});

describe('GET /api/users (como admin)', () => {
  it('responde 200 con la lista y sin campos sensibles', async () => {
    User.findAll.mockResolvedValue([fakeUser(), fakeUser({ id: 2, email: 'luis@stride.com' })]);
    const response = await request(protectedApp).get('/api/users').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expectNoSensitiveFields(response.body);
  });

  it('GET /:id responde 200 con el usuario y sin campos sensibles', async () => {
    User.findByPk.mockResolvedValue(fakeUser());
    const response = await request(protectedApp).get('/api/users/1').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.id).toBe(1);
    expectNoSensitiveFields(response.body);
  });

  it('GET /:id responde 404 si no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    const response = await request(protectedApp).get('/api/users/99').set(users.admin);
    expect(response.statusCode).toBe(404);
  });

  it('GET /:id responde 400 si el id no es válido', async () => {
    const response = await request(protectedApp).get('/api/users/abc').set(users.admin);
    expect(response.statusCode).toBe(400);
  });
});

describe('POST /api/users (como admin)', () => {
  it('crea el usuario con password_hash y salt_key, y nunca guarda el password', async () => {
    User.create.mockImplementation(async (values) => fakeUser(values));
    const response = await request(protectedApp)
      .post('/api/users')
      .set(users.admin)
      .send(nuevoUsuario);

    expect(response.statusCode).toBe(201);
    expect(response.body.data.email).toBe(nuevoUsuario.email);

    const saved = User.create.mock.calls[0][0];
    expect(saved).not.toHaveProperty('password');
    expect(saved.password_hash).toMatch(/^\$2[aby]\$/);
    expect(saved.salt_key).toBeDefined();
    expect(saved.password_hash).not.toBe(nuevoUsuario.password);
    expect(await verifyPassword(nuevoUsuario.password, saved.password_hash)).toBe(true);
  });

  it('la respuesta no incluye password, password_hash ni salt_key', async () => {
    User.create.mockImplementation(async (values) => fakeUser(values));
    const response = await request(protectedApp)
      .post('/api/users')
      .set(users.admin)
      .send(nuevoUsuario);

    expectNoSensitiveFields(response.body);
    expect(JSON.stringify(response.body)).not.toContain(nuevoUsuario.password);
  });

  it('responde 400 si falta el password', async () => {
    const { password, ...sinPassword } = nuevoUsuario;
    const response = await request(protectedApp).post('/api/users').set(users.admin).send(sinPassword);
    expect(response.statusCode).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('responde 400 si el password es muy corto', async () => {
    const response = await request(protectedApp)
      .post('/api/users')
      .set(users.admin)
      .send({ ...nuevoUsuario, password: '123' });
    expect(response.statusCode).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('responde 400 si faltan campos obligatorios', async () => {
    const response = await request(protectedApp)
      .post('/api/users')
      .set(users.admin)
      .send({ password: 'Secret123' });
    expect(response.statusCode).toBe(400);
  });

  it('responde 409 si el email ya existe', async () => {
    const duplicado = new Error('Validation error');
    duplicado.name = 'SequelizeUniqueConstraintError';
    User.create.mockRejectedValue(duplicado);

    const response = await request(protectedApp)
      .post('/api/users')
      .set(users.admin)
      .send(nuevoUsuario);
    expect(response.statusCode).toBe(409);
  });
});

describe('PUT /api/users/:id (como admin)', () => {
  it('con password nuevo genera un nuevo salt y un nuevo hash', async () => {
    const user = fakeUser();
    const oldHash = user.data.password_hash;
    const oldSalt = user.data.salt_key;
    User.findByPk.mockResolvedValue(user);

    const response = await request(protectedApp)
      .put('/api/users/1')
      .set(users.admin)
      .send({ password: 'NuevaClave456' });

    expect(response.statusCode).toBe(200);
    const changes = user.update.mock.calls[0][0];
    expect(changes).not.toHaveProperty('password');
    expect(changes.password_hash).not.toBe(oldHash);
    expect(changes.salt_key).not.toBe(oldSalt);
    expect(await verifyPassword('NuevaClave456', changes.password_hash)).toBe(true);
    expectNoSensitiveFields(response.body);
  });

  it('sin password no toca el hash ni el salt', async () => {
    const user = fakeUser();
    User.findByPk.mockResolvedValue(user);

    const response = await request(protectedApp)
      .put('/api/users/1')
      .set(users.admin)
      .send({ first_name: 'Carlos' });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.first_name).toBe('Carlos');
    const changes = user.update.mock.calls[0][0];
    expect(changes).not.toHaveProperty('password_hash');
    expect(changes).not.toHaveProperty('salt_key');
  });

  it('ignora password_hash y salt_key enviados por el cliente', async () => {
    const user = fakeUser();
    User.findByPk.mockResolvedValue(user);

    await request(protectedApp)
      .put('/api/users/1')
      .set(users.admin)
      .send({ first_name: 'Carlos', password_hash: 'hack', salt_key: 'hack' });

    const changes = user.update.mock.calls[0][0];
    expect(changes).not.toHaveProperty('password_hash');
    expect(changes).not.toHaveProperty('salt_key');
  });

  it('responde 404 si el usuario no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    const response = await request(protectedApp)
      .put('/api/users/99')
      .set(users.admin)
      .send({ first_name: 'Carlos' });
    expect(response.statusCode).toBe(404);
  });

  it('responde 400 si el body no trae datos válidos', async () => {
    User.findByPk.mockResolvedValue(fakeUser());
    const response = await request(protectedApp).put('/api/users/1').set(users.admin).send({});
    expect(response.statusCode).toBe(400);
  });

  it('responde 400 si el password nuevo es muy corto', async () => {
    User.findByPk.mockResolvedValue(fakeUser());
    const response = await request(protectedApp)
      .put('/api/users/1')
      .set(users.admin)
      .send({ password: '123' });
    expect(response.statusCode).toBe(400);
  });

  it('responde 409 si el email ya existe', async () => {
    const user = fakeUser();
    const duplicado = new Error('Validation error');
    duplicado.name = 'SequelizeUniqueConstraintError';
    user.update.mockRejectedValue(duplicado);
    User.findByPk.mockResolvedValue(user);

    const response = await request(protectedApp)
      .put('/api/users/1')
      .set(users.admin)
      .send({ email: 'otro@stride.com' });
    expect(response.statusCode).toBe(409);
  });
});

describe('DELETE /api/users/:id (como admin)', () => {
  it('elimina el usuario y responde 200', async () => {
    const user = fakeUser();
    User.findByPk.mockResolvedValue(user);
    const response = await request(protectedApp).delete('/api/users/1').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(user.destroy).toHaveBeenCalled();
  });

  it('responde 404 si el usuario no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    const response = await request(protectedApp).delete('/api/users/99').set(users.admin);
    expect(response.statusCode).toBe(404);
  });
});

describe('Rutas inexistentes', () => {
  it('GET a una subruta inexistente de /api/users debe responder 404', async () => {
    // No llega al middleware de autorización: Express no encuentra la ruta.
    const response = await request(app).get('/api/users/1/inexistente');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});
