const config = require('config');
const { DEMO_USERS, api, login, createCleanup } = require('./helpers');

describe('Autenticación (E2E)', () => {
  let cleanup;

  beforeEach(() => {
    cleanup = createCleanup();
  });

  afterEach(async () => {
    await cleanup.run();
  });

  it('login correcto devuelve un JWT', async () => {
    const response = await api()
      .post('/api/auth/login')
      .send({
        email: DEMO_USERS.admin,
        password: config.get('seed.demoPasswords.admin')
      });

    expect(response.statusCode).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.split('.')).toHaveLength(3);
  });

  it('credenciales incorrectas responden 401', async () => {
    const wrongPassword = await api()
      .post('/api/auth/login')
      .send({
        email: DEMO_USERS.admin,
        password: 'contraseña-incorrecta'
      });
    expect(wrongPassword.statusCode).toBe(401);

    const wrongUser = await api()
      .post('/api/auth/login')
      .send({
        email: 'inexistente@stride.co',
        password: config.get('seed.demoPasswords.admin')
      });
    expect(wrongUser.statusCode).toBe(401);
  });

  it('datos incompletos responden 400', async () => {
    const missingPassword = await api()
      .post('/api/auth/login')
      .send({ email: DEMO_USERS.admin });
    expect(missingPassword.statusCode).toBe(400);

    const missingEmail = await api()
      .post('/api/auth/login')
      .send({ password: config.get('seed.demoPasswords.admin') });
    expect(missingEmail.statusCode).toBe(400);

    const emptyBody = await api()
      .post('/api/auth/login')
      .send({});
    expect(emptyBody.statusCode).toBe(400);
  });

  it('usuario inactivo responde 401', async () => {
    const adminToken = await login('admin');

    // Se busca el rol por nombre para no depender de que su id sea 3
    const roles = await api()
      .get('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(roles.statusCode).toBe(200);
    const userRole = roles.body.data.find((role) => role.name === 'user');
    expect(userRole).toBeDefined();

    const email = `inactivo-${Date.now()}@stride.co`;
    const password = 'Password-Inactivo-2026!';

    const createRes = await api()
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: 'Usuario',
        last_name: 'Inactivo',
        email,
        password,
        active: false,
        role_id: userRole.id
      });

    expect(createRes.statusCode).toBe(201);
    cleanup.track('/api/users', createRes.body.data.id);
    expect(createRes.body.data.active).toBe(false);

    const loginRes = await api()
      .post('/api/auth/login')
      .send({ email, password });

    expect(loginRes.statusCode).toBe(401);
  });

  it('GET /api/products sin token y con token inválido responde 401', async () => {
    const sinToken = await api().get('/api/products');
    expect(sinToken.statusCode).toBe(401);

    const tokenInvalido = await api()
      .get('/api/products')
      .set('Authorization', 'Bearer token-invalido');
    expect(tokenInvalido.statusCode).toBe(401);
  });

  it('GET /api/auth/me con token válido responde 200 y no incluye password_hash ni salt_key', async () => {
    const token = await login('admin');
    const response = await api()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.password_hash).toBeUndefined();
    expect(response.body.salt_key).toBeUndefined();
    expect(response.body).not.toHaveProperty('password_hash');
    expect(response.body).not.toHaveProperty('salt_key');
  });

  it('GET /api/auth/me sin token responde 401', async () => {
    const response = await api().get('/api/auth/me');
    expect(response.statusCode).toBe(401);
  });

});
