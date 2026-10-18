const request = require('supertest');
const app = require('../app');
const customersRouter = require('../routes/customers');
const Customer = require('../models/documents/Customer');
const { buildApp, users } = require('./helpers/rbacApp');

// Customers está protegido con RBAC (propiedad real: Customer.userId == req.user.id).
// Las consultas a Mongoose se simulan, igual que en orders, para que npm test
// siga sin depender de una MongoDB real.
const protectedApp = buildApp((a) => a.use('/api/customers', customersRouter));

// users.user = { id: 10 }, users.otherUser = { id: 20 } (ver test/helpers/rbacApp.js)
const customerOfUser = { _id: 'c00000000000000000000d1', userId: 10, phone: '6141112233', email: 'propio@stride.com' };
const customerOfOther = { _id: 'c00000000000000000000d2', userId: 20, phone: '6149998877', email: 'ajeno@stride.com' };

function mockLean(value) {
  return { lean: () => Promise.resolve(value) };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Autorización de /api/customers', () => {
  it('sin usuario autenticado responde 401', async () => {
    const response = await request(protectedApp).get('/api/customers');
    expect(response.statusCode).toBe(401);
  });

  it('un rol sin permiso de delete (user) responde 403 sin tocar la base de datos', async () => {
    const deleteSpy = jest.spyOn(Customer, 'findByIdAndDelete');
    const response = await request(protectedApp).delete(`/api/customers/${customerOfUser._id}`).set(users.user);
    expect(response.statusCode).toBe(403);
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});

describe('GET /api/customers (lista)', () => {
  it('any: sales ve todos los clientes, sin filtrar por usuario', async () => {
    jest.spyOn(Customer, 'find').mockReturnValue(mockLean([customerOfUser, customerOfOther]));

    const response = await request(protectedApp).get('/api/customers').set(users.sales);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(2);
  });

  it('own: user solo ve su propio cliente', async () => {
    jest.spyOn(Customer, 'find').mockImplementation((filter) => {
      expect(filter.userId).toBe(10);
      return mockLean([customerOfUser]);
    });

    const response = await request(protectedApp).get('/api/customers').set(users.user);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual([customerOfUser]);
  });
});

describe('GET /api/customers/:id', () => {
  it('own: permite consultar el propio cliente', async () => {
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(customerOfUser));

    const response = await request(protectedApp).get(`/api/customers/${customerOfUser._id}`).set(users.user);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual(customerOfUser);
  });

  it('own: 403 al consultar el cliente de otro usuario', async () => {
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(customerOfOther));

    const response = await request(protectedApp).get(`/api/customers/${customerOfOther._id}`).set(users.user);

    expect(response.statusCode).toBe(403);
  });

  it('any: sales consulta cualquier cliente', async () => {
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(customerOfOther));

    const response = await request(protectedApp).get(`/api/customers/${customerOfOther._id}`).set(users.sales);

    expect(response.statusCode).toBe(200);
  });

  it('own: 404 si el cliente no existe', async () => {
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(null));

    const response = await request(protectedApp).get('/api/customers/000000000000000000000000').set(users.user);

    expect(response.statusCode).toBe(404);
  });
});

describe('POST /api/customers', () => {
  it('create:any: sales puede crear un cliente y responde 201', async () => {
    const nuevoCliente = { userId: 30, phone: '6141112233', email: 'nuevo@stride.com' };
    jest.spyOn(Customer, 'create').mockResolvedValue({ _id: 'c00000000000000000000d3', ...nuevoCliente });

    const response = await request(protectedApp).post('/api/customers').set(users.sales).send(nuevoCliente);

    expect(response.statusCode).toBe(201);
    expect(response.body.data.email).toBe(nuevoCliente.email);
  });

  it('create:any: user no puede crear clientes', async () => {
    const response = await request(protectedApp).post('/api/customers').set(users.user).send({});
    expect(response.statusCode).toBe(403);
  });
});

describe('PUT /api/customers/:id', () => {
  it('own: permite actualizar el propio cliente', async () => {
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(customerOfUser));
    jest.spyOn(Customer, 'findByIdAndUpdate').mockReturnValue(mockLean({ ...customerOfUser, phone: '6140000000' }));

    const response = await request(protectedApp)
      .put(`/api/customers/${customerOfUser._id}`)
      .set(users.user)
      .send({ phone: '6140000000' });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.phone).toBe('6140000000');
  });

  it('own: 403 al intentar actualizar el cliente de otro usuario', async () => {
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(customerOfOther));
    const updateSpy = jest.spyOn(Customer, 'findByIdAndUpdate');

    const response = await request(protectedApp)
      .put(`/api/customers/${customerOfOther._id}`)
      .set(users.user)
      .send({ phone: '6140000000' });

    expect(response.statusCode).toBe(403);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/customers/:id', () => {
  it('delete:any: admin puede eliminar', async () => {
    jest.spyOn(Customer, 'findByIdAndDelete').mockReturnValue(mockLean(customerOfUser));

    const response = await request(protectedApp).delete(`/api/customers/${customerOfUser._id}`).set(users.admin);

    expect(response.statusCode).toBe(200);
  });

  it('sales no tiene permiso de eliminar: responde 403', async () => {
    const response = await request(protectedApp).delete(`/api/customers/${customerOfUser._id}`).set(users.sales);
    expect(response.statusCode).toBe(403);
  });
});

describe('Ruta inexistente', () => {
  it('GET a una subruta inexistente de /api/customers, sin token, responde 401', async () => {
    // authenticate (issue #75) protege todo el prefijo /api/customers.
    const response = await request(app).get('/api/customers/1/inexistente');
    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});
