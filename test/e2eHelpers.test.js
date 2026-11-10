// Pruebas (con mocks, sin bases de datos) de la infraestructura de las pruebas E2E:
// test/e2e/helpers.js, baseUrl.js y globalSetup.js. Las suites E2E reales viven en test/e2e/.
const express = require('express');
const http = require('http');
const config = require('config');

// Servidor falso que imita los endpoints que usan los helpers
function startFakeApi() {
  const calls = [];
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { calls.push(`${req.method} ${req.path}`); next(); });
  app.post('/api/auth/login', (req, res) => {
    const known = { 'admin@stride.co': 'admin', 'sales@stride.co': 'sales' };
    const role = known[req.body.email];
    if (!role || req.body.password !== config.get(`seed.demoPasswords.${role}`)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res.json({ token: `token-de-${role}` });
  });
  app.delete('/api/products/:id', (req, res) => {
    if (req.get('authorization') !== 'Bearer token-de-admin') return res.status(403).json({});
    return res.status(req.params.id === '404' ? 404 : 200).json({});
  });
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => resolve({ server, calls, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

describe('test/e2e/helpers', () => {
  let fake;
  let helpers;
  const originalBaseUrl = process.env.E2E_BASE_URL;

  beforeEach(async () => {
    fake = await startFakeApi();
    process.env.E2E_BASE_URL = fake.url;
    jest.resetModules(); // cada prueba parte sin tokens guardados
    helpers = require('./e2e/helpers');
  });
  afterEach(() => {
    fake.server.close();
    if (originalBaseUrl === undefined) delete process.env.E2E_BASE_URL;
    else process.env.E2E_BASE_URL = originalBaseUrl;
  });

  it('login(rol) pide el JWT del usuario de demostración del rol', async () => {
    await expect(helpers.login('admin')).resolves.toBe('token-de-admin');
    await expect(helpers.login('sales')).resolves.toBe('token-de-sales');
  });

  it('login(rol) guarda el token: solo hace una petición por rol', async () => {
    await helpers.login('admin');
    await helpers.login('admin');
    expect(fake.calls.filter((c) => c === 'POST /api/auth/login')).toHaveLength(1);
  });

  it('login(rol) con un rol desconocido falla con un mensaje claro', async () => {
    await expect(helpers.login('root')).rejects.toThrow(/Rol desconocido: root/);
  });

  it('login(rol) explica qué hacer cuando el usuario no existe en la base (falta el seed)', async () => {
    await expect(helpers.login('user')).rejects.toThrow(/npm run seed/);
  });

  it('authHeader(rol) devuelve la cabecera Authorization con el token', async () => {
    await expect(helpers.authHeader('admin')).resolves.toEqual({ Authorization: 'Bearer token-de-admin' });
  });

  it('createCleanup elimina lo creado en orden inverso e ignora los 404', async () => {
    const cleanup = helpers.createCleanup();
    cleanup.track('/api/products', 1);
    cleanup.track('/api/products', 404);
    cleanup.track('/api/products', 3);
    await cleanup.run();
    expect(fake.calls.filter((c) => c.startsWith('DELETE'))).toEqual([
      'DELETE /api/products/3', 'DELETE /api/products/404', 'DELETE /api/products/1'
    ]);
  });

  it('createCleanup se puede ejecutar dos veces sin repetir eliminaciones', async () => {
    const cleanup = helpers.createCleanup();
    cleanup.track('/api/products', 1);
    await cleanup.run();
    await cleanup.run();
    expect(fake.calls.filter((c) => c.startsWith('DELETE'))).toHaveLength(1);
  });
});

describe('test/e2e/baseUrl', () => {
  const original = process.env.E2E_BASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.E2E_BASE_URL;
    else process.env.E2E_BASE_URL = original;
  });

  it('por defecto usa e2e.baseUrl de la configuración', () => {
    delete process.env.E2E_BASE_URL;
    const { getBaseUrl } = require('./e2e/baseUrl');
    expect(getBaseUrl()).toBe('http://localhost:3000');
  });

  it('E2E_BASE_URL apunta la suite a otro servidor (Render) y quita la diagonal final', () => {
    process.env.E2E_BASE_URL = 'https://stride.onrender.com/';
    const { getBaseUrl } = require('./e2e/baseUrl');
    expect(getBaseUrl()).toBe('https://stride.onrender.com');
  });
});

describe('test/e2e/globalSetup (espera a la API)', () => {
  const { waitForApi } = require('./e2e/globalSetup');

  it('espera hasta que /health responde 200', async () => {
    const fetchFn = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } }))
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 200 });
    const url = await waitForApi({ timeoutMs: 5000, intervalMs: 1, fetchFn });
    expect(url).toMatch(/\/health$/);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('si la API no responde a tiempo falla con un mensaje que explica qué hacer', async () => {
    const fetchFn = jest.fn().mockRejectedValue(Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } }));
    await expect(waitForApi({ timeoutMs: 30, intervalMs: 5, fetchFn })).rejects.toThrow(/npm start.*E2E_BASE_URL/s);
  });
});
