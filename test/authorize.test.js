const request = require('supertest');
const createError = require('http-errors');
const authorize = require('../middlewares/authorize');
const { buildApp, users } = require('./helpers/rbacApp');

const ok = (req, res) => res.json({ ok: true, possession: req.rbac && req.rbac.possession });
const ownerIs = (ownerId) => jest.fn(async () => ownerId);

describe('middleware authorize', () => {
  let resolver;
  let app;
  beforeEach(() => {
    resolver = ownerIs(10); // el recurso pertenece al usuario 10
    app = buildApp((a) => {
      a.get('/any', authorize('products', 'delete', 'any'), ok);
      a.get('/own', authorize('orders', 'read', 'own', resolver), ok);
      a.get('/own-list', authorize('orders', 'read', 'own'), ok);
      a.get('/missing', authorize('orders', 'read', 'own', async () => { throw createError(404, 'No existe'); }), ok);
      a.get('/null-owner', authorize('orders', 'read', 'own', ownerIs(null)), ok);
    });
  });

  it('401 si no hay usuario autenticado', async () => {
    expect((await request(app).get('/any')).statusCode).toBe(401);
  });

  it('permite cuando el rol tiene el permiso any', async () => {
    const res = await request(app).get('/any').set(users.admin);
    expect(res.statusCode).toBe(200);
    expect(res.body.possession).toBe('any');
  });

  it('403 cuando el rol no tiene el permiso', async () => {
    const res = await request(app).get('/any').set(users.sales);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.status).toBe(403);
  });

  it('403 si el rol no existe en la BD', async () => {
    const res = await request(app).get('/any').set({ 'x-test-user': JSON.stringify({ id: 9, role: 'fantasma' }) });
    expect(res.statusCode).toBe(403);
  });

  it('own: permite si el recurso es del usuario', async () => {
    const res = await request(app).get('/own').set(users.user); // id 10 = dueño
    expect(res.statusCode).toBe(200);
    expect(res.body.possession).toBe('own');
  });

  it('own: 403 si el recurso es de otro usuario', async () => {
    expect((await request(app).get('/own').set(users.otherUser)).statusCode).toBe(403); // id 20
  });

  it('own: un rol con any no necesita pasar por el resolver', async () => {
    const res = await request(app).get('/own').set(users.sales);
    expect(res.statusCode).toBe(200);
    expect(res.body.possession).toBe('any');
    expect(resolver).not.toHaveBeenCalled();
  });

  it('own sin resolver (listados): permite y marca el alcance own', async () => {
    const res = await request(app).get('/own-list').set(users.user);
    expect(res.body.possession).toBe('own');
  });

  it('own: propietario desconocido (null) se deniega', async () => {
    expect((await request(app).get('/null-owner').set(users.user)).statusCode).toBe(403);
  });

  it('own: un error del resolver (404) llega al manejador de errores', async () => {
    expect((await request(app).get('/missing').set(users.user)).statusCode).toBe(404);
  });
});
