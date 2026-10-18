require('dotenv').config({ quiet: true });
const { sequelize, User, Role, Permission } = require('../models/relationals');
const { ROLES, ROLE_PERMISSIONS, PERMISSION_KEYS, USERS } = require('./rbacMatrix');
const { hashPassword, verifyPassword } = require('../services/password');

const DEV_DEFAULT_PASSWORD = 'Stride-Dev-123';

function getSeedPassword() {
  const fromEnv = process.env.SEED_USER_PASSWORD;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SEED_USER_PASSWORD es obligatoria en producción');
  }
  return DEV_DEFAULT_PASSWORD;
}

async function seedRbac() {
  const seedPassword = getSeedPassword();

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
    const user = await User.findOne({ where: { email: data.email } });

    if (!user) {
      const credentials = await hashPassword(seedPassword);
      await User.create({ ...data, role_id: roleId, ...credentials });
      users.created += 1;
      continue;
    }

    const changes = {};
    if (user.role_id !== roleId) changes.role_id = roleId;
    if (!(await verifyPassword(seedPassword, user.password_hash))) {

      Object.assign(changes, await hashPassword(seedPassword));
    }

    if (Object.keys(changes).length > 0) {
      await user.update(changes);
      users.updated += 1;
    } else {
      users.unchanged += 1;
    }
  }

  return { roles: ROLES.length, permissions: PERMISSION_KEYS.length, users };
}

module.exports = seedRbac;

if (require.main === module) {
  seedRbac()
    .then((r) => {
      console.log(`Seed RBAC listo: ${r.roles} roles, ${r.permissions} permisos`);
      console.log(`Usuarios de prueba: ${r.users.created} creados, ${r.users.updated} actualizados, ${r.users.unchanged} sin cambios`);
      return sequelize.close();
    })
    .catch((err) => { console.error('Error en el seed:', err); process.exit(1); });
}