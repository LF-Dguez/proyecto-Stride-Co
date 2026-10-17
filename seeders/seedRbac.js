require('dotenv').config({ quiet: true });
const { sequelize, User, Role, Permission } = require('../models/relationals');
const { ROLES, ROLE_PERMISSIONS, PERMISSION_KEYS, USERS } = require('./rbacMatrix');

// Siembra roles, permisos, role_permission y usuarios de prueba. Se puede ejecutar varias veces.
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

  // role_permission: se reemplaza el conjunto para que la BD refleje exactamente la matriz
  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    await roles[roleName].setPermissions(keys.map((key) => permissions[key]));
  }

  for (const { role, ...data } of USERS) {
    await User.findOrCreate({ where: { email: data.email }, defaults: { ...data, role_id: roles[role].id } });
  }

  return { roles: ROLES.length, permissions: PERMISSION_KEYS.length };
}

module.exports = seedRbac;

if (require.main === module) {
  seedRbac()
    .then((r) => { console.log(`Seed RBAC listo: ${r.roles} roles, ${r.permissions} permisos`); return sequelize.close(); })
    .catch((err) => { console.error('Error en el seed:', err.message); process.exit(1); });
}
