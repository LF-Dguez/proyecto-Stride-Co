const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../models/relationals', () => ({
  User: { findOne: jest.fn() }
}));
const { User } = require('../models/relationals');
const { hashPassword } = require('../services/password');

const app = require('../app');

const SENSITIVE_FIELDS = ['password', 'password_hash', 'salt_key'];

// Simula una instancia de Sequelize: igual que el modelo real, toJSON() oculta
// los campos sensibles al serializar (ver models/relationals/User.js).
async function fakeUser({ password, ...overrides } = {}) {
  const { password_hash, salt_key } = await hashPassword(password || 'Secret123');
  const data = {
    id: 1,
    first_name: 'Ana',
    last_name: 'Lopez',
    email: 'ana@stride.co',
    role_id: 2,
    active: true,
    password_hash,
    salt_key,
    ...overrides
  };
  return {
    ...data,
    toJSON: () => Object.fromEntries(Object.entries(data).filter(([key]) => !SENSITIVE_FIELDS.includes(key)))
  };
}

function expectNoSensitiveFields(body) {
  const text = JSON.stringify(body);
  SENSITIVE_FIELDS.forEach((field) => expect(text).not.toContain(`"${field}"`));
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('POST /api/auth/login', () => {
  it('200: credenciales correctas devuelve token y datos seguros del usuario', async () => {
    const user = await fakeUser({ password: 'Secret123' });
    User.findOne.mockResolvedValue(user);

    const response = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Secret123' });

    expect(response.statusCode).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user.email).toBe(user.email);
    expectNoSensitiveFields(response.body);

    const payload = jwt.decode(response.body.token);
    expect(payload.sub).toBe(String(user.id));
    expect(payload).not.toHaveProperty('password_hash');
    expect(payload).not.toHaveProperty('salt_key');
  });

  it('400: falta email', async () => {
    const response = await request(app).post('/api/auth/login').send({ password: 'Secret123' });
    expect(response.statusCode).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('400: falta password', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'ana@stride.co' });
    expect(response.statusCode).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('401: email inexistente responde con el mensaje genérico', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-existe@stride.co', password: 'cualquiera' });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid credentials' });
  });

  it('401: contraseña incorrecta responde con el mismo mensaje genérico', async () => {
    const user = await fakeUser({ password: 'Secret123' });
    User.findOne.mockResolvedValue(user);

    const response = await request(app).post('/api/auth/login').send({ email: user.email, password: 'incorrecta' });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid credentials' });
  });

  it('401: usuario inactivo responde con el mismo mensaje genérico', async () => {
    const user = await fakeUser({ password: 'Secret123', active: false });
    User.findOne.mockResolvedValue(user);

    const response = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Secret123' });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid credentials' });
  });
});
