// Acceso a datos de Role/Permission para el panel (F14). Cada cambio de
// permisos recarga el RBAC en memoria desde la base de datos (services/rbac.js),
// sin reiniciar el servidor (sección 4.6/4.7).
const { Role, Permission } = require('../models/sql');
const rbac = require('./rbac');

const include = [{ model: Permission, as: 'permissions' }];

function listAll() {
  return Role.findAll({ include, order: [['id', 'ASC']] });
}

function getById(id) {
  return Role.findByPk(id, { include });
}

function listAllPermissions() {
  return Permission.findAll({ order: [['key', 'ASC']] });
}

async function setPermissions(id, permissionIds) {
  const role = await Role.findByPk(id);
  if (!role) return null;
  const permissions = permissionIds.length ? await Permission.findAll({ where: { id: permissionIds } }) : [];
  await role.setPermissions(permissions);
  await rbac.loadAccessControl();
  return role;
}

module.exports = { listAll, getById, listAllPermissions, setPermissions };
