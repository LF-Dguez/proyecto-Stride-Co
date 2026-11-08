const mongoose = require('mongoose');
const Product = require('../models/sql/Product');
const ProductVariant = require('../models/sql/ProductVariant');
const Inventory = require('../models/sql/Inventory');
const Permission = require('../models/sql/Permission');
const User = require('../models/sql/User');
const Order = require('../models/mongo/Order');
const Customer = require('../models/mongo/Customer');

// Devuelve el error de validación (o null si el documento es válido)
async function validationError(doc) {
  try {
    await doc.validate();
    return null;
  } catch (err) {
    return err;
  }
}

describe('Product', () => {
  const valid = { name: 'Tenis Trail X', description: 'Para correr', brand: 'Stride', price: 1599.99 };

  it('acepta un producto válido con description', async () => {
    expect(await validationError(Product.build(valid))).toBeNull();
  });
  it('rechaza un producto sin nombre', async () => {
    expect(await validationError(Product.build({ ...valid, name: '' }))).not.toBeNull();
  });
  it('rechaza un precio negativo', async () => {
    expect(await validationError(Product.build({ ...valid, price: -1 }))).not.toBeNull();
  });
});

describe('ProductVariant', () => {
  it('acepta una variante válida', async () => {
    expect(await validationError(ProductVariant.build({ sku: 'STR-RUN-27', color: 'Rosa', size: '27' }))).toBeNull();
  });
  it('rechaza una variante sin sku', async () => {
    expect(await validationError(ProductVariant.build({ color: 'Rosa' }))).not.toBeNull();
  });
});

describe('Inventory', () => {
  it('reserved vale 0 por defecto', () => {
    expect(Inventory.build({ stock: 5 }).reserved).toBe(0);
  });
  it('rechaza stock negativo', async () => {
    expect(await validationError(Inventory.build({ stock: -1 }))).not.toBeNull();
  });
  it('rechaza reserved negativo', async () => {
    expect(await validationError(Inventory.build({ stock: 5, reserved: -1 }))).not.toBeNull();
  });
});

describe('Permission', () => {
  it('acepta keys con formato recurso:acción:alcance', async () => {
    expect(await validationError(Permission.build({ key: 'orders:read:own' }))).toBeNull();
  });
  it.each(['products.read', 'products:read:all', 'products:publish:any', 'Products:read:any'])(
    'rechaza la key %s',
    async (key) => {
      expect(await validationError(Permission.build({ key }))).not.toBeNull();
    }
  );
});

describe('User', () => {
  const valid = {
    first_name: 'Ana', last_name: 'Lopez', email: 'ana@stride.co',
    password_hash: 'hash', salt_key: 'salt'
  };

  it('acepta un usuario válido', async () => {
    expect(await validationError(User.build(valid))).toBeNull();
  });
  it('rechaza un correo con formato inválido', async () => {
    expect(await validationError(User.build({ ...valid, email: 'no-es-correo' }))).not.toBeNull();
  });
  it('rechaza un usuario sin nombre', async () => {
    expect(await validationError(User.build({ ...valid, first_name: '' }))).not.toBeNull();
  });
});

describe('Order', () => {
  const valid = () => ({
    customerId: new mongoose.Types.ObjectId(),
    paymentMethod: 'CARD',
    shippingAddress: { street: 'Av. Siempre Viva', number: '742', city: 'Chihuahua', state: 'Chihuahua', postalCode: '31000', country: 'México' },
    items: [{ productId: 1, quantity: 2, unitPrice: 100 }],
    statusHistory: [{ status: 'PENDING', changedById: 2, note: 'Orden creada' }]
  });

  it('acepta una orden válida y calcula los totales', async () => {
    const order = new Order(valid());
    expect(await validationError(order)).toBeNull();
    expect(order.totals.total).toBe(200);
    expect(order.statusHistory[0].changedAt).toBeInstanceOf(Date);
  });
  it('rechaza una orden sin cliente', async () => {
    const data = valid();
    delete data.customerId;
    expect((await validationError(new Order(data))).errors.customerId).toBeDefined();
  });
  it('rechaza un item sin productId', async () => {
    const data = valid();
    data.items = [{ quantity: 1, unitPrice: 10 }];
    expect(await validationError(new Order(data))).not.toBeNull();
  });
  it.each([0, -1, 1.5])('rechaza una cantidad inválida (%s)', async (quantity) => {
    const data = valid();
    data.items = [{ productId: 1, quantity, unitPrice: 10 }];
    expect(await validationError(new Order(data))).not.toBeNull();
  });
  it('rechaza un método de pago fuera del enum', async () => {
    expect(await validationError(new Order({ ...valid(), paymentMethod: 'BITCOIN' }))).not.toBeNull();
  });
  it('rechaza un estado inválido en statusHistory', async () => {
    const data = valid();
    data.statusHistory = [{ status: 'LOST' }];
    expect(await validationError(new Order(data))).not.toBeNull();
  });
});

describe('Customer', () => {
  const valid = {
    userId: 10,
    email: 'ana@stride.co',
    addresses: [{ type: 'shipping', street: 'Calle 1', city: 'Chihuahua' }]
  };

  it('acepta un cliente válido', async () => {
    expect(await validationError(new Customer(valid))).toBeNull();
  });
  it('rechaza un correo con formato inválido', async () => {
    expect((await validationError(new Customer({ ...valid, email: 'nope' }))).errors.email).toBeDefined();
  });
  it('rechaza una dirección sin calle', async () => {
    const data = { ...valid, addresses: [{ type: 'SHIPPING', city: 'Chihuahua' }] };
    expect(await validationError(new Customer(data))).not.toBeNull();
  });
});