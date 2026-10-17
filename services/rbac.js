const AccessControl = require('accesscontrol');

const ACTIONS = ['create', 'read', 'update', 'delete'];
const POSSESSIONS = ['any', 'own'];

let accessControl = null;
let roleNameById = {};

// 'orders:read:own' -> { resource: 'orders', action: 'read', possession: 'own' }
function parsePermissionKey(key) {
  const parts = String(key).split(':');
  const [resource, action, possession] = parts;
  if (parts.length !== 3 || !resource || !ACTIONS.includes(action) || !POSSESSIONS.includes(possession)) {
    throw new Error(`Permission.key inválida: "${key}" (formato recurso:accion:alcance)`);
  }
  return { resource, action, possession };
}

// rows: [{ role: 'admin', key: 'products:read:any' }, ...]  ->  instancia de AccessControl
function buildAccessControl(rows) {
  const grants = rows.map(({ role, key }) => {
    const { resource, action, possession } = parsePermissionKey(key);
    return { role, resource, action: `${action}:${possession}`, attributes: '*' };
  });
  return new AccessControl(grants);
}

// Fuente de verdad: Role -> role_permission -> Permission (MySQL)
async function loadAccessControl() {
  const { Role, Permission } = require('../models/relationals');
  const roles = await Role.findAll({ include: [{ model: Permission, as: 'permissions' }] });

  const rows = [];
  const names = {};
  roles.forEach((role) => {
    names[role.id] = role.name;
    role.permissions.forEach((permission) => rows.push({ role: role.name, key: permission.key }));
  });

  accessControl = buildAccessControl(rows);
  roleNameById = names;
  return accessControl;
}

const getAccessControl = () => accessControl;

// Para pruebas: inyecta una instancia ya construida
function setAccessControl(ac, roles = {}) {
  accessControl = ac;
  roleNameById = roles;
}

// El usuario autenticado trae role_id (users.role_id); se traduce al nombre del rol cargado de la BD
const getRoleName = (user) => user.role || roleNameById[user.role_id];

module.exports = { parsePermissionKey, buildAccessControl, loadAccessControl, getAccessControl, setAccessControl, getRoleName };
