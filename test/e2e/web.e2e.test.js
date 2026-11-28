// Flujo SSR de extremo a extremo (sección 4.11 del Entregable 3): contra la aplicación
// en ejecución y con bases de datos reales, usando request.agent() para conservar la
// cookie de sesión entre peticiones (las vistas web no usan el header Authorization).
const config = require('config');
const request = require('supertest');
const { getBaseUrl } = require('./baseUrl');
const { DEMO_USERS } = require('./helpers');

describe('Flujo web SSR (E2E)', () => {
  it('POST /login abre una página protegida; tras POST /logout esa misma página vuelve a pedir login', async () => {
    const agent = request.agent(getBaseUrl());

    // Sin sesión, el panel redirige a /login conservando a dónde se iba (sección 4.7)
    const beforeLogin = await agent.get('/admin');
    expect(beforeLogin.statusCode).toBe(302);
    expect(beforeLogin.headers.location).toBe('/login?next=%2Fadmin');

    const loginRes = await agent
      .post('/login')
      .type('form')
      .send({ email: DEMO_USERS.admin, password: config.get('seed.demoPasswords.admin') });
    expect(loginRes.statusCode).toBe(302);
    expect(loginRes.headers.location).toBe('/');
    expect(loginRes.headers['set-cookie'].some((c) => c.startsWith('access_token='))).toBe(true);

    const protectedRes = await agent.get('/admin');
    expect(protectedRes.statusCode).toBe(200);
    expect(protectedRes.headers['content-type']).toMatch(/html/);
    expect(protectedRes.text).toContain('Panel');

    const logoutRes = await agent.post('/logout');
    expect(logoutRes.statusCode).toBe(302);
    expect(logoutRes.headers.location).toBe('/');

    const afterLogout = await agent.get('/admin');
    expect(afterLogout.statusCode).toBe(302);
    expect(afterLogout.headers.location).toBe('/login?next=%2Fadmin');
  });

  it('el selector de idioma del layout conserva la elección en una cookie al navegar', async () => {
    const agent = request.agent(getBaseUrl());

    const enRes = await agent.get('/?lang=en');
    expect(enRes.statusCode).toBe(200);
    expect(enRes.text).toContain('Find your');
    expect(enRes.headers['set-cookie'].some((c) => c.startsWith('lang=en'))).toBe(true);

    // Sin ?lang= en la siguiente petición, la cookie conserva el idioma elegido
    const productsRes = await agent.get('/products');
    expect(productsRes.statusCode).toBe(200);
    expect(productsRes.text).toContain('All products');
  });
});
