const config = require('config');
const mongoose = require('mongoose');
const { sequelize, User, Role, Permission, Product, ProductVariant, Inventory } = require('../models/sql');
const Customer = require('../models/mongo/Customer');
const Order = require('../models/mongo/Order');
const connectMongo = require('../config/mongoose');
const { ROLES, ROLE_PERMISSIONS, PERMISSION_KEYS, USERS } = require('./rbacMatrix');
const { hashPassword, verifyPassword } = require('../services/password');
const { seedSampleSql, SAMPLE_PRODUCTS } = require('./sampleSql');
const { seedSampleMongo, buildCatalog, buildUserIds } = require('./sampleMongo');

// Contraseña de los usuarios de demostración, una por rol (seed.demoPasswords.<role>).
// Es un dato ficticio que se documenta en el README y no debe reutilizarse en ninguna otra cuenta.
function getDemoPassword(role) {
  const key = `seed.demoPasswords.${role}`;
  if (!config.has(key)) throw new Error(`Falta ${key} en la configuración (config/default.json)`);
  return config.get(key);
}

async function seedRbac() {
  await sequelize.sync();

  const roles = {};
  for (const data of ROLES) {
    const [role] = await Role.findOrCreate({ where: { name: data.name }, defaults: data });
    roles[data.name] = role;
  }

  const permissions = {};
  for (const key of PERMISSION_KEYS) {
    const [permission] = await Permission.findOrCreate({
      where: { key },
      defaults: { key, description: `Permiso ${key}` }
    });
    permissions[key] = permission;
  }

  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    await roles[roleName].setPermissions(keys.map((key) => permissions[key]));
  }


  const users = { created: 0, updated: 0, unchanged: 0 };
  for (const { role, ...data } of USERS) {
    const roleId = roles[role].id;
    const demoPasswords = getDemoPassword(role);
    const user = await User.findOne({ where: { email: data.email } });

    if (!user) {
      const credentials = await hashPassword(demoPasswords);
      await User.create({ ...data, role_id: roleId, active: true, ...credentials });
      users.created += 1;
      continue;
    }

    const changes = {};
    if (user.role_id !== roleId) changes.role_id = roleId;
    if (user.active !== true) changes.active = true;
    if (!(await verifyPassword(demoPasswords, user.password_hash))) {
      Object.assign(changes, await hashPassword(demoPasswords));
    }

    if (Object.keys(changes).length > 0) {
      await user.update(changes);
      users.updated += 1;
    } else {
      users.unchanged += 1;
    }
  }

  const sample = await seedSampleSql({ Product, ProductVariant, Inventory });

  return { roles: ROLES.length, permissions: PERMISSION_KEYS.length, users, sample };
}

module.exports = seedRbac;

// Runner de npm run seed: siembra PostgreSQL y después MongoDB. Las dos conexiones se cierran
// al terminar, incluso si algo falla, para que el proceso no se quede colgado.
async function runSeed() {
  try {
    const r = await seedRbac();
    console.log(`Seed RBAC listo: ${r.roles} roles, ${r.permissions} permisos`);
    console.log(`Usuarios de demostración: ${r.users.created} creados, ${r.users.updated} actualizados, ${r.users.unchanged} sin cambios`);
    console.log(`Datos de ejemplo: ${r.sample.products} productos, ${r.sample.variants} variantes y ${r.sample.inventory} registros de inventario creados`);

    await connectMongo();
    const users = await User.findAll({ where: { email: USERS.map((u) => u.email) } });
    const products = await Product.findAll({ where: { name: SAMPLE_PRODUCTS.map((p) => p.name) } });
    const mongo = await seedSampleMongo({
      Customer,
      Order,
      userIds: buildUserIds(users),
      catalog: buildCatalog(products)
    });
    console.log(`Datos de ejemplo de MongoDB: ${mongo.customers.created} clientes creados (${mongo.customers.updated} actualizados) y ${mongo.orders.created} órdenes creadas`);
  } catch (err) {
    console.error('Error en el seed:', err);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([sequelize.close(), mongoose.disconnect()]);
  }
}

if (require.main === module) {
  runSeed();
}