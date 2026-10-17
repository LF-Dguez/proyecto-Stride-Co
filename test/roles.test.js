const request = require('supertest');
const app = require('../app');
const rolesRouter = require('../routes/roles');
const { buildApp, users } = require('./helpers/rbacApp');

// Roles está protegido con RBAC (issue #50): solo admin tiene roles:*:any.
const protectedApp = buildApp((a) => a.use('/api/roles', rolesRouter));

describe('Autorización de /api/roles', () => {
  it('sin usuario autenticado responde 401', async () => {
    const response = await request(protectedApp).get('/api/roles');
    expect(response.statusCode).toBe(401);
  });

  it('un rol sin permiso (user) responde 403', async () => {
    const response = await request(protectedApp).get('/api/roles').set(users.user);
    expect(response.statusCode).toBe(403);
    expect(response.body.error.status).toBe(403);
  });
});

describe('API de Roles (como admin)', () => {

  it('GET /api/roles debe responder 200 con datos', async () => {
    const response = await request(protectedApp).get('/api/roles').set(users.admin);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('GET /api/roles/:id debe responder 200 con un rol', async () => {
    const response = await request(protectedApp).get('/api/roles/1').set(users.admin);
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('id');
  });

  it('POST /api/roles debe crear un rol y responder 201', async () => {
    const nuevoRol = {
      name: 'INVENTORY',
      description: 'Encargado de inventario'
    };
    const response = await request(protectedApp)
      .post('/api/roles')
      .set(users.admin)
      .send(nuevoRol);

    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.name).toBe(nuevoRol.name);
  });

  it('PUT /api/roles/:id debe actualizar y responder 200', async () => {
    const datosActualizados = { description: 'Administrador general' };
    const response = await request(protectedApp)
      .put('/api/roles/1')
      .set(users.admin)
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.description).toBe(datosActualizados.description);
  });

  it('DELETE /api/roles/:id debe eliminar y responder 200', async () => {
    const response = await request(protectedApp).delete('/api/roles/1').set(users.admin);
    expect(response.statusCode).toBe(200);
  });

  it('GET a una subruta inexistente de /api/roles debe responder 404', async () => {
    const response = await request(app).get('/api/roles/1/inexistente');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

});
