const request = require('supertest');
const config = require('config');
const { getBaseUrl } = require('./baseUrl');

// Usuarios de demostración que crea `npm run seed` (uno por rol)
const DEMO_USERS = {
  admin: 'admin@stride.co',
  sales: 'sales@stride.co',
  user: 'user@stride.co'
};

// Supertest contra la API en ejecución (sin mocks)
const api = () => request(getBaseUrl());

const tokens = {};

/**
 * Inicia sesión con el usuario de demostración de un rol y devuelve su JWT.
 * El token se guarda: se pide una sola vez por rol en toda la suite.
 *   const token = await login('admin');
 */
async function login(role) {
  if (!DEMO_USERS[role]) throw new Error(`Rol desconocido: ${role} (usa ${Object.keys(DEMO_USERS).join(', ')})`);
  if (tokens[role]) return tokens[role];

  const response = await api()
    .post('/api/auth/login')
    .send({ email: DEMO_USERS[role], password: config.get(`seed.demoPasswords.${role}`) });

  const token = response.body.data && response.body.data.token;
  if (response.statusCode !== 200 || !token) {
    throw new Error(
      `No se pudo iniciar sesión como "${role}" (${response.statusCode}). ¿Se ejecutó "npm run seed" en las bases de la API?`
    );
  }
  tokens[role] = token;
  return tokens[role];
}

// Cabecera Authorization lista para usar:  api().get('/api/products').set(await authHeader('admin'))
async function authHeader(role) {
  return { Authorization: `Bearer ${await login(role)}` };
}

/**
 * Registro de datos creados por una prueba para eliminarlos al terminar (afterAll), de modo que la
 * suite pueda ejecutarse varias veces seguidas y no llene Atlas (512 MB).
 *   const cleanup = createCleanup();
 *   cleanup.track('/api/products', id);      // al crear
 *   afterAll(() => cleanup.run());           // elimina en orden inverso
 */
function createCleanup(role = 'admin') {
  const created = [];
  return {
    track(resourcePath, id) {
      created.push({ resourcePath, id });
    },
    async run() {
      const headers = await authHeader(role);
      for (const { resourcePath, id } of created.reverse()) {
        // 404 = ya se eliminó dentro de la prueba: no es un error
        await api().delete(`${resourcePath}/${id}`).set(headers);
      }
      created.length = 0;
    }
  };
}

module.exports = { DEMO_USERS, api, login, authHeader, createCleanup };
