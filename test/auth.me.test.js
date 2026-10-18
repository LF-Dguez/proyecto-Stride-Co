const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../models/relationals', () => ({
  User: { findByPk: jest.fn() }
}));
const { User } = require('../models/relationals');

const app = require('../app');

const SENSITIVE_FIELDS = ['password', 'password_hash', 'salt_key'];

function fakeUser(overrides = {}) {
  const data = {
    id: 1,
    first_name: 'Ana',
    last_name: 'Lopez',
    email: 'ana@stride.co',
    role_id: 2,
    active: true,
    password_hash: '$2b$04$hashDeEjemplo',
    salt_key: '$2b$04$saltDeEjemplo',
    ...overrides
  };
  return {
    ...data,
    toJSON: () => Object.fromEntries(Object.entries(data).filter(([key]) => !SENSITIVE_FIELDS.includes(key)))
  };
}

function sign(sub) {
  return jwt.sign({ sub: String(sub) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    algorithm: 'HS256'
  });
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('GET /api/auth/me', () => {
  it('401 sin token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.statusCode).toBe(401);
  });

  it('401 con token inválido', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-invalido');
    expect(response.statusCode).toBe(401);
  });

  it('200 con token válido, sin campos sensibles', async () => {
    const user = fakeUser();
    User.findByPk.mockResolvedValue(user);

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${sign(user.id)}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role_id: user.role_id,
      active: user.active
    });
    const text = JSON.stringify(response.body);
    SENSITIVE_FIELDS.forEach((field) => expect(text).not.toContain(`"${field}"`));
  });
});
