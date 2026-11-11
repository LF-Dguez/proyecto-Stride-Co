const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('config');
const i18n = require('../config/i18n');

jest.mock('../models/sql', () => ({
  User: { findByPk: jest.fn() }
}));
const { User } = require('../models/sql');
const authenticate = require('../middlewares/authenticate');

// App mínima: monta authenticate sobre una ruta de prueba y usa el mismo
// formato de error que app.js ({ error: { message, status } }), para
// comprobar que los errores de express-jwt llegan tal cual se esperan.
function buildApp() {
  const app = express();
  app.use(i18n.middleware); // req.__() disponible, igual que en app.js
  app.get('/protegido', authenticate, (req, res) => {
    res.json({ id: req.user.id, role_id: req.user.role_id });
  });
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: { message: err.message, status: err.status || 500 } });
  });
  return app;
}

const app = buildApp();

function sign(payload, overrides = {}) {
  return jwt.sign(payload, overrides.secret || config.get('jwt.secret'), {
    expiresIn: overrides.expiresIn || config.get('jwt.expiresIn'),
    issuer: overrides.issuer || config.get('jwt.issuer'),
    audience: overrides.audience || config.get('jwt.audience'),
    algorithm: 'HS256'
  });
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('middleware authenticate', () => {
  it('401 sin token', async () => {
    const response = await request(app).get('/protegido');
    expect(response.statusCode).toBe(401);
    expect(response.body.error.status).toBe(401);
  });

  it('401 con token firmado con otra clave', async () => {
    const token = sign({ sub: '1' }, { secret: 'clave-equivocada' });
    const response = await request(app).get('/protegido').set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(401);
  });

  it('401 con token expirado', async () => {
    const token = sign({ sub: '1' }, { expiresIn: '-10s' });
    const response = await request(app).get('/protegido').set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(401);
  });

  it('401 con issuer incorrecto', async () => {
    const token = sign({ sub: '1' }, { issuer: 'otro-issuer' });
    const response = await request(app).get('/protegido').set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(401);
  });

  it('401 con audience incorrecta', async () => {
    const token = sign({ sub: '1' }, { audience: 'otra-audiencia' });
    const response = await request(app).get('/protegido').set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(401);
  });

  it('401 si el usuario del token no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    const token = sign({ sub: '99' });

    const response = await request(app).get('/protegido').set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(401);
    expect(User.findByPk).toHaveBeenCalledWith(99);
  });

  it('401 si el usuario del token está inactivo', async () => {
    User.findByPk.mockResolvedValue({ id: 1, role_id: 2, active: false });
    const token = sign({ sub: '1' });

    const response = await request(app).get('/protegido').set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(401);
  });

  it('200 y req.user poblado con un token válido', async () => {
    User.findByPk.mockResolvedValue({ id: 7, role_id: 3, active: true });
    const token = sign({ sub: '7' });

    const response = await request(app).get('/protegido').set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ id: 7, role_id: 3 });
  });
});
