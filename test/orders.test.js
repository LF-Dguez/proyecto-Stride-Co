const request = require('supertest');
const app = require('../app');
const ordersRouter = require('../routes/orders');
const Order = require('../models/documents/Order');
const Customer = require('../models/documents/Customer');
const { buildApp, users } = require('./helpers/rbacApp');

// Orders está protegido con RBAC y alcance real de propiedad (issue #51):
// Order.customerId -> Customer.userId se compara contra el usuario autenticado.
// Las consultas a Mongoose se simulan (no requieren una MongoDB real) para que
// npm test siga corriendo sin servicios externos, igual que el resto del proyecto.
const protectedApp = buildApp((a) => a.use('/api/orders', ordersRouter));

// users.user = { id: 10 }, users.otherUser = { id: 20 } (ver test/helpers/rbacApp.js)
const customerOfUser = { _id: 'c00000000000000000000a1', userId: 10 };
const customerOfOther = { _id: 'c00000000000000000000a2', userId: 20 };
const orderOfUser = { _id: 'o00000000000000000000b1', customerId: customerOfUser._id, paymentMethod: 'CARD' };
const orderOfOther = { _id: 'o00000000000000000000b2', customerId: customerOfOther._id, paymentMethod: 'CASH' };

function mockLean(value) {
  return { lean: () => Promise.resolve(value) };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Autorización de /api/orders', () => {
  it('sin usuario autenticado responde 401', async () => {
    const response = await request(protectedApp).get('/api/orders');
    expect(response.statusCode).toBe(401);
  });

  it('un rol sin permiso de delete (user) responde 403 sin tocar la base de datos', async () => {
    const findSpy = jest.spyOn(Order, 'findByIdAndDelete');
    const response = await request(protectedApp).delete(`/api/orders/${orderOfUser._id}`).set(users.user);
    expect(response.statusCode).toBe(403);
    expect(findSpy).not.toHaveBeenCalled();
  });
});

describe('GET /api/orders (lista)', () => {
  it('any: admin ve todas las órdenes, sin filtrar por cliente', async () => {
    jest.spyOn(Order, 'find').mockReturnValue(mockLean([orderOfUser, orderOfOther]));
    const customerSpy = jest.spyOn(Customer, 'find');

    const response = await request(protectedApp).get('/api/orders').set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(customerSpy).not.toHaveBeenCalled();
  });

  it('own: user solo ve las órdenes de sus propios clientes', async () => {
    jest.spyOn(Customer, 'find').mockReturnValue(mockLean([customerOfUser]));
    jest.spyOn(Order, 'find').mockImplementation((filter) => {
      expect(filter.customerId.$in).toEqual([customerOfUser._id]);
      return mockLean([orderOfUser]);
    });

    const response = await request(protectedApp).get('/api/orders').set(users.user);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual([orderOfUser]);
  });
});

describe('GET /api/orders/:id', () => {
  it('own: permite consultar una orden propia', async () => {
    jest.spyOn(Order, 'findById').mockReturnValue(mockLean(orderOfUser));
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(customerOfUser));

    const response = await request(protectedApp).get(`/api/orders/${orderOfUser._id}`).set(users.user);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual(orderOfUser);
  });

  it('own: 403 al consultar la orden de otro usuario', async () => {
    jest.spyOn(Order, 'findById').mockReturnValue(mockLean(orderOfOther));
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(customerOfOther));

    const response = await request(protectedApp).get(`/api/orders/${orderOfOther._id}`).set(users.user);

    expect(response.statusCode).toBe(403);
  });

  it('any: admin consulta cualquier orden sin pasar por el resolver', async () => {
    jest.spyOn(Order, 'findById').mockReturnValue(mockLean(orderOfOther));
    const customerSpy = jest.spyOn(Customer, 'findById');

    const response = await request(protectedApp).get(`/api/orders/${orderOfOther._id}`).set(users.admin);

    expect(response.statusCode).toBe(200);
    expect(customerSpy).not.toHaveBeenCalled();
  });

  it('own: 404 si la orden no existe', async () => {
    jest.spyOn(Order, 'findById').mockReturnValue(mockLean(null));

    const response = await request(protectedApp).get('/api/orders/000000000000000000000000').set(users.user);

    expect(response.statusCode).toBe(404);
  });
});

describe('POST /api/orders', () => {
  it('create:any: user puede crear su propia orden y responde 201', async () => {
    const nuevaOrden = { customerId: customerOfUser._id, salesPersonId: 1, paymentMethod: 'CARD' };
    jest.spyOn(Order, 'create').mockResolvedValue({ _id: 'o000000000000000000000c1', ...nuevaOrden });

    const response = await request(protectedApp).post('/api/orders').set(users.user).send(nuevaOrden);

    expect(response.statusCode).toBe(201);
    expect(response.body.data.paymentMethod).toBe('CARD');
  });
});

describe('PUT /api/orders/:id', () => {
  it('own: permite actualizar una orden propia', async () => {
    jest.spyOn(Order, 'findById').mockReturnValue(mockLean(orderOfUser));
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(customerOfUser));
    jest.spyOn(Order, 'findByIdAndUpdate').mockReturnValue(mockLean({ ...orderOfUser, paymentMethod: 'CASH' }));

    const response = await request(protectedApp)
      .put(`/api/orders/${orderOfUser._id}`)
      .set(users.user)
      .send({ paymentMethod: 'CASH' });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.paymentMethod).toBe('CASH');
  });

  it('own: 403 al intentar actualizar la orden de otro usuario', async () => {
    jest.spyOn(Order, 'findById').mockReturnValue(mockLean(orderOfOther));
    jest.spyOn(Customer, 'findById').mockReturnValue(mockLean(customerOfOther));
    const updateSpy = jest.spyOn(Order, 'findByIdAndUpdate');

    const response = await request(protectedApp)
      .put(`/api/orders/${orderOfOther._id}`)
      .set(users.user)
      .send({ paymentMethod: 'CASH' });

    expect(response.statusCode).toBe(403);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/orders/:id', () => {
  it('delete:any: solo admin puede eliminar', async () => {
    jest.spyOn(Order, 'findByIdAndDelete').mockReturnValue(mockLean(orderOfUser));

    const response = await request(protectedApp).delete(`/api/orders/${orderOfUser._id}`).set(users.admin);

    expect(response.statusCode).toBe(200);
  });

  it('sales no tiene permiso de eliminar: responde 403', async () => {
    const response = await request(protectedApp).delete(`/api/orders/${orderOfUser._id}`).set(users.sales);
    expect(response.statusCode).toBe(403);
  });
});

describe('Ruta inexistente', () => {
  it('GET a una subruta inexistente de /api/orders, sin token, responde 401', async () => {
    // authenticate (issue #75) protege todo el prefijo /api/orders.
    const response = await request(app).get('/api/orders/1/inexistente');
    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});
