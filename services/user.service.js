// Acceso a datos de User para el panel (F13), compartido con la API igual que
// las demás funcionalidades (sección 4.4). Nunca devuelve password_hash/salt_key:
// User.prototype.toJSON() ya los oculta (models/sql/User.js).
const { User, Role } = require('../models/sql');
const { hashPassword } = require('./password');

const include = [{ model: Role, as: 'role' }];

function listAll() {
  return User.findAll({ include, order: [['id', 'ASC']] });
}

function getById(id) {
  return User.findByPk(id, { include });
}

function listRoles() {
  return Role.findAll({ order: [['name', 'ASC']] });
}

async function createUser({ first_name, last_name, email, role_id, password }) {
  const { password_hash, salt_key } = await hashPassword(password);
  return User.create({ first_name, last_name, email, role_id, password_hash, salt_key });
}

async function updateUser(id, fields, password) {
  const user = await User.findByPk(id);
  if (!user) return null;
  const changes = { ...fields };
  if (password) Object.assign(changes, await hashPassword(password));
  return user.update(changes);
}

async function setActive(id, active) {
  const user = await User.findByPk(id);
  if (!user) return null;
  return user.update({ active });
}

module.exports = { listAll, getById, listRoles, createUser, updateUser, setActive };
