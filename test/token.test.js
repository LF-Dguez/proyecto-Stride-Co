// La configuración se simula para poder cambiarla en cada prueba (config es inmutable)
jest.mock('config', () => {
  const values = {};
  return {
    __values: values,
    has: (key) => values[key] !== undefined,
    get: (key) => {
      if (values[key] === undefined) throw new Error(`Configuration property "${key}" is not defined`);
      return values[key];
    }
  };
});

const jwt = require('jsonwebtoken');
const config = require('config');
const { signToken } = require('../services/token');

const user = {
  id: 7,
  email: 'ana@stride.co',
  role_id: 2,
  password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  salt_key: '$2b$10$N9qo8uLOickgx2ZMRZoMyeI'
};

describe('services/token', () => {
  beforeEach(() => {
    Object.assign(config.__values, {
      'jwt.secret': 'secreto-de-prueba',
      'jwt.expiresIn': '15m',
      'jwt.issuer': 'stride-co',
      'jwt.audience': 'stride-co-api'
    });
  });
  afterEach(() => {
    Object.keys(config.__values).forEach((key) => delete config.__values[key]);
  });

  const verify = (token) => jwt.verify(token, config.get('jwt.secret'), {
    algorithms: ['HS256'],
    issuer: config.get('jwt.issuer'),
    audience: config.get('jwt.audience')
  });

  it('firma un JWT válido con sub, iss, aud y exp', () => {
    const payload = verify(signToken(user));
    expect(payload.sub).toBe('7');
    expect(payload.iss).toBe('stride-co');
    expect(payload.aud).toBe('stride-co-api');
    expect(typeof payload.exp).toBe('number');
  });

  it('usa el algoritmo HS256', () => {
    const { header } = jwt.decode(signToken(user), { complete: true });
    expect(header.alg).toBe('HS256');
  });

  it('el payload contiene únicamente la información necesaria (sin datos sensibles)', () => {
    const payload = verify(signToken(user));
    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'sub']);
    const raw = Buffer.from(signToken(user).split('.')[1], 'base64url').toString();
    expect(raw).not.toMatch(/password|salt_key|\$2b\$|email|role/);
  });

  it('la expiración depende de jwt.expiresIn', () => {
    let payload = verify(signToken(user));
    expect(payload.exp - payload.iat).toBe(15 * 60);

    config.__values['jwt.expiresIn'] = '1h';
    payload = verify(signToken(user));
    expect(payload.exp - payload.iat).toBe(60 * 60);
  });

  it('un token firmado con otra clave no se puede verificar', () => {
    const token = signToken(user);
    expect(() => jwt.verify(token, 'otra-clave', { algorithms: ['HS256'] })).toThrow();
  });

  it.each(['jwt.secret', 'jwt.expiresIn', 'jwt.issuer', 'jwt.audience'])(
    'no firma el token si falta %s', (key) => {
      delete config.__values[key];
      expect(() => signToken(user)).toThrow(new RegExp(key.replace('.', '\\.')));
    }
  );

  it('no firma el token si jwt.secret está vacío', () => {
    config.__values['jwt.secret'] = '';
    expect(() => signToken(user)).toThrow(/jwt\.secret/);
  });
});
