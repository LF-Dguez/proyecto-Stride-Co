const config = require('config');
const { RESOURCES, ACTIONS, ROLES, ROLE_PERMISSIONS, PERMISSION_KEYS, USERS } = require('../seeders/rbacMatrix');
const { seedSampleSql, SAMPLE_PRODUCTS } = require('../seeders/sampleSql');

describe('Matriz RBAC del seed', () => {
  it('todos los recursos tienen un permiso any registrado para cada acción', () => {
    RESOURCES.forEach((resource) => {
      ACTIONS.forEach((action) => {
        expect(PERMISSION_KEYS).toContain(`${resource}:${action}:any`);
      });
    });
  });

  it('todas las keys siguen el formato recurso:acción:alcance', () => {
    const format = /^[a-z]+:(create|read|update|delete):(own|any)$/;
    PERMISSION_KEYS.forEach((key) => expect(key).toMatch(format));
  });

  it('los roles de la matriz son los mismos que se siembran', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(ROLES.map((r) => r.name).sort());
  });

  it('admin tiene todos los permisos any', () => {
    const anyKeys = PERMISSION_KEYS.filter((key) => key.endsWith(':any'));
    anyKeys.forEach((key) => expect(ROLE_PERMISSIONS.admin).toContain(key));
  });

  it('el alcance own solo existe en customers y orders', () => {
    PERMISSION_KEYS.filter((key) => key.endsWith(':own')).forEach((key) => {
      expect(['customers', 'orders']).toContain(key.split(':')[0]);
    });
  });
});

describe('Usuarios de demostración', () => {
  const passwordOf = (role) => config.get(`seed.demoPasswords.${role}`);

  it('hay exactamente un usuario por cada rol', () => {
    expect(USERS.map((u) => u.role).sort()).toEqual(ROLES.map((r) => r.name).sort());
  });

  it('cada rol tiene su contraseña de demostración en la configuración', () => {
    ROLES.forEach(({ name }) => {
      expect(config.has(`seed.demoPasswords.${name}`)).toBe(true);
      expect(passwordOf(name).length).toBeGreaterThanOrEqual(8);
    });
  });

  it('las contraseñas son distintas entre sí y distintas del secreto del JWT', () => {
    const passwords = ROLES.map(({ name }) => passwordOf(name));
    expect(new Set(passwords).size).toBe(passwords.length);
    passwords.forEach((password) => expect(password).not.toBe(config.get('jwt.secret')));
  });
});

// Modelo simulado: findOrCreate guarda los registros en memoria, como lo haría la base de datos
function mockModel() {
  const store = new Map();
  let nextId = 1;
  return {
    store,
    findOrCreate: jest.fn(async ({ where, defaults }) => {
      const key = JSON.stringify(where);
      if (store.has(key)) return [store.get(key), false];
      const record = { id: nextId++, ...defaults, ...where };
      store.set(key, record);
      return [record, true];
    })
  };
}

describe('seedSampleSql', () => {
  const totalVariants = SAMPLE_PRODUCTS.reduce((sum, p) => sum + p.variants.length, 0);

  it('crea productos, variantes e inventario con relaciones válidas', async () => {
    const models = { Product: mockModel(), ProductVariant: mockModel(), Inventory: mockModel() };
    const created = await seedSampleSql(models);

    expect(created).toEqual({ products: SAMPLE_PRODUCTS.length, variants: totalVariants, inventory: totalVariants });

    const productIds = [...models.Product.store.values()].map((p) => p.id);
    const variants = [...models.ProductVariant.store.values()];
    variants.forEach((variant) => expect(productIds).toContain(variant.product_id));

    const variantIds = variants.map((v) => v.id);
    [...models.Inventory.store.values()].forEach((inv) => {
      expect(variantIds).toContain(inv.variant_id);
      expect(inv.stock).toBeGreaterThanOrEqual(0);
    });
  });

  it('es idempotente: una segunda ejecución no crea ni duplica nada', async () => {
    const models = { Product: mockModel(), ProductVariant: mockModel(), Inventory: mockModel() };
    await seedSampleSql(models);
    const second = await seedSampleSql(models);

    expect(second).toEqual({ products: 0, variants: 0, inventory: 0 });
    expect(models.Product.store.size).toBe(SAMPLE_PRODUCTS.length);
    expect(models.ProductVariant.store.size).toBe(totalVariants);
    expect(models.Inventory.store.size).toBe(totalVariants);
  });

  it('los sku de las variantes son únicos', () => {
    const skus = SAMPLE_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku));
    expect(new Set(skus).size).toBe(skus.length);
  });
});