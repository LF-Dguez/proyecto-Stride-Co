const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../app');
const authenticate = require('../middlewares/authenticate');
const { RESOURCES, ACTIONS, ROLE_PERMISSIONS } = require('../seeders/rbacMatrix');
const { matrixMarkdown } = require('../seeders/matrixTable');

const ACTION_BY_METHOD = { get: 'read', post: 'create', put: 'update', patch: 'update', delete: 'delete' };

// Excepciones de la sección 4.3 del Entregable 2
const PUBLIC = ['GET /', 'GET /health', 'POST /api/auth/login'];
const AUTHENTICATE_ONLY = ['GET /api/auth/me'];

// '^\/api\/users\/?(?=\/|$)' -> '/api/users'
function mountPath(layer) {
  return layer.regexp.source
    .replace(/^\^/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\\\//g, '/');
}

// Recorre app._router y devuelve cada endpoint con sus middlewares
function listEndpoints() {
  const endpoints = [];
  app._router.stack
    .filter((layer) => layer.name === 'router')
    .forEach((layer) => {
      const mount = mountPath(layer);
      layer.handle.stack.filter((l) => l.route).forEach((l) => {
        Object.keys(l.route.methods).forEach((method) => {
          endpoints.push({
            method,
            path: `${mount}${l.route.path === '/' ? '' : l.route.path}` || '/',
            handlers: l.route.stack.map((s) => s.handle)
          });
        });
      });
    });
  return endpoints;
}

// Middlewares montados con app.use(ruta, ...middlewares, router): { '/api/users': [fn, fn, ...] }
function mountedMiddlewares() {
  const byMount = {};
  app._router.stack.filter((layer) => layer.name !== 'router' && layer.regexp.source.includes('\\/api')).forEach((layer) => {
    const mount = mountPath(layer);
    byMount[mount] = [...(byMount[mount] || []), layer.handle];
  });
  return byMount;
}

const label = (e) => `${e.method.toUpperCase()} ${e.path}`;
const endpoints = listEndpoints();
const apiEndpoints = endpoints.filter((e) => !PUBLIC.includes(label(e)) && !AUTHENTICATE_ONLY.includes(label(e)));
const rbacOf = (e) => e.handlers.map((h) => h.rbac).find(Boolean);

describe('auditoría de rutas: autenticación y RBAC en todas', () => {
  it('detecta los endpoints de la API (sin esto la auditoría no serviría)', () => {
    expect(endpoints).toHaveLength(RESOURCES.length * 5 + PUBLIC.length + AUTHENTICATE_ONLY.length);
    expect(apiEndpoints).toHaveLength(RESOURCES.length * 5); // 5 endpoints por recurso
  });

  it('solo las excepciones del PDF son públicas o solo-authenticate', () => {
    const labels = endpoints.map(label);
    [...PUBLIC, ...AUTHENTICATE_ONLY].forEach((exception) => expect(labels).toContain(exception));
  });

  it.each(PUBLIC)('%s no lleva authenticate ni authorize', (name) => {
    const endpoint = endpoints.find((e) => label(e) === name);
    expect(rbacOf(endpoint)).toBeUndefined();
    expect(endpoint.handlers).not.toContain(authenticate[0]);
  });

  it('GET /api/auth/me usa solo authenticate (sin authorize)', () => {
    const endpoint = endpoints.find((e) => label(e) === 'GET /api/auth/me');
    expect(endpoint.handlers).toEqual(expect.arrayContaining(authenticate));
    expect(rbacOf(endpoint)).toBeUndefined();
  });

  describe.each(apiEndpoints.map((e) => [label(e), e]))('%s', (_name, endpoint) => {
    const resource = endpoint.path.split('/')[2];
    const rbac = rbacOf(endpoint);

    it('está protegido con authorize()', () => {
      expect(rbac).toBeDefined();
    });

    it('el recurso del permiso es el de la ruta y la acción corresponde al verbo HTTP', () => {
      expect(rbac.resource).toBe(resource);
      expect(rbac.action).toBe(ACTION_BY_METHOD[endpoint.method]);
    });

    it('el permiso existe en la matriz (admin tiene recurso:acción:any)', () => {
      expect(ROLE_PERMISSIONS.admin).toContain(`${rbac.resource}:${rbac.action}:any`);
    });

    it('sin token responde 401 (authenticate corre antes que authorize)', async () => {
      const url = endpoint.path.replace(':id', '1');
      const response = await request(app)[endpoint.method](url).send({});
      expect(response.statusCode).toBe(401);
    });
  });

  it.each(RESOURCES)('/api/%s se monta con authenticate (express-jwt + carga del usuario)', (resource) => {
    // Sin esto authorize() también respondería 401 por falta de req.user y el fallo pasaría inadvertido
    const middlewares = mountedMiddlewares()[`/api/${resource}`] || [];
    expect(middlewares).toEqual(expect.arrayContaining(authenticate));
  });

  it('con un token inválido también responde 401', async () => {
    const response = await request(app).get('/api/products').set('Authorization', 'Bearer no-es-un-token');
    expect(response.statusCode).toBe(401);
  });

  it('las rutas públicas responden sin token', async () => {
    expect((await request(app).get('/health')).statusCode).toBe(200);
    expect((await request(app).get('/')).statusCode).toBe(200);
    expect((await request(app).post('/api/auth/login').send({})).statusCode).toBe(400);
  });
});

describe('matriz RBAC: seed, README y reglas de código', () => {
  it('cada recurso tiene sus 4 permisos CRUD con alcance any para admin', () => {
    RESOURCES.forEach((resource) => ACTIONS.forEach((action) => {
      expect(ROLE_PERMISSIONS.admin).toContain(`${resource}:${action}:any`);
    }));
  });

  it('hay al menos tres roles con permisos distintos', () => {
    const roles = Object.keys(ROLE_PERMISSIONS);
    expect(roles.length).toBeGreaterThanOrEqual(3);
    const signatures = roles.map((role) => [...ROLE_PERMISSIONS[role]].sort().join(','));
    expect(new Set(signatures).size).toBe(roles.length);
  });

  it('están los alcances own y any de orders (read:own y read:any)', () => {
    expect(ROLE_PERMISSIONS.user).toContain('orders:read:own');
    expect(ROLE_PERMISSIONS.sales).toContain('orders:read:any');
  });

  it('la matriz del README es exactamente la generada desde el seed (npm run matrix)', () => {
    const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
    expect(readme).toContain(matrixMarkdown());
  });

  it('ni los controllers ni las rutas comparan nombres de rol para autorizar', () => {
    const dirs = ['controllers', 'routes'];
    const offenders = dirs.flatMap((dir) => fs.readdirSync(path.join(__dirname, '..', dir))
      .filter((file) => file.endsWith('.js'))
      .filter((file) => {
        const code = fs.readFileSync(path.join(__dirname, '..', dir, file), 'utf8');
        return /\.role\s*[!=]==|role_id\s*[!=]==|[!=]==\s*['"](admin|sales|user)['"]/.test(code);
      })
      .map((file) => `${dir}/${file}`));
    expect(offenders).toEqual([]);
  });
});
