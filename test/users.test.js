const request = require('supertest');
const app = require('../app');
const usersRouter = require('../routes/users');
const { buildApp, users } = require('./helpers/rbacApp');

// Users está protegido con RBAC (issue #50): solo admin tiene users:*:any.
// Las operaciones se prueban montando el router real sobre la app de pruebas
// que simula la autenticación (ver test/helpers/rbacApp.js).
const protectedApp = buildApp((a) => a.use('/api/users', usersRouter));

describe('Autorización de /api/users', () => {
  it('sin usuario autenticado responde 401', async () => {
    const response = await request(protectedApp).get('/api/users');
    expect(response.statusCode).toBe(401);
  });

  it('un rol sin permiso (sales) responde 403', async () => {
    const response = await request(protectedApp).get('/api/users').set(users.sales);
    expect(response.statusCode).toBe(403);
    expect(response.body.error.status).toBe(403);
  });
});

describe('API de Users (como admin)', () => {

  it('GET /api/users debe responder 200 con datos', async () => {
    const response = await request(protectedApp).get('/api/users').set(users.admin);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('GET /api/users/:id debe responder 200 con un usuario', async () => {
    const response = await request(protectedApp).get('/api/users/1').set(users.admin);
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('id');
  });

  it('POST /api/users debe crear un usuario y responder 201', async () => {
    const nuevoUsuario = {
      first_name: 'Ana',
      last_name: 'Lopez',
      email: 'ana@stride.com',
      role_id: 2
    };
    const response = await request(protectedApp)
      .post('/api/users')
      .set(users.admin)
      .send(nuevoUsuario);

    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.email).toBe(nuevoUsuario.email);
  });

  it('PUT /api/users/:id debe actualizar y responder 200', async () => {
    const datosActualizados = { first_name: 'Carlos' };
    const response = await request(protectedApp)
      .put('/api/users/1')
      .set(users.admin)
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.first_name).toBe(datosActualizados.first_name);
  });

  it('DELETE /api/users/:id debe eliminar y responder 200', async () => {
    const response = await request(protectedApp).delete('/api/users/1').set(users.admin);
    expect(response.statusCode).toBe(200);
  });

  it('GET a una subruta inexistente de /api/users debe responder 404', async () => {
    // No llega al middleware de autorización: Express no encuentra la ruta.
    const response = await request(app).get('/api/users/1/inexistente');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

});
