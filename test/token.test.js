const jwt = require('jsonwebtoken');
const { signToken } = require('../services/token');

const user = {
  id: 7,
  email: 'ana@stride.co',
  role_id: 2,
  password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  salt_key: '$2b$10$N9qo8uLOickgx2ZMRZoMyeI'
};

describe('services/token', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  const verify = (token) => jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE
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

  it('la expiración depende de JWT_EXPIRES_IN', () => {
    process.env.JWT_EXPIRES_IN = '15m';
    let payload = verify(signToken(user));
    expect(payload.exp - payload.iat).toBe(15 * 60);

    process.env.JWT_EXPIRES_IN = '1h';
    payload = verify(signToken(user));
    expect(payload.exp - payload.iat).toBe(60 * 60);
  });

  it('un token firmado con otra clave no se puede verificar', () => {
    const token = signToken(user);
    expect(() => jwt.verify(token, 'otra-clave', { algorithms: ['HS256'] })).toThrow();
  });

  it.each(['JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_ISSUER', 'JWT_AUDIENCE'])(
    'no firma el token si falta %s', (name) => {
      delete process.env[name];
      expect(() => signToken(user)).toThrow(new RegExp(name));
    }
  );
});
