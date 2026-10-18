const createError = require('http-errors');
const { Role, Permission, User } = require('../models/relationals');
const rbac = require('../services/rbac');
const { parseId, pickFields, toHttpError } = require('../utils/sequelizeHelpers');

const EDITABLE_FIELDS = ['name', 'description'];

// Cada rol se devuelve con sus permisos (tabla role_permission), sin las columnas de la tabla intermedia
const include = [{ model: Permission, as: 'permissions', through: { attributes: [] } }];

// Valida permission_ids ([1, 2, ...]) y devuelve los permisos; undefined si no se envió
async function findPermissions(body) {
  if (!body || body.permission_ids === undefined) return undefined;
  const ids = body.permission_ids;
  if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    throw createError(400, 'permission_ids debe ser un arreglo de IDs de permisos');
  }
  const permissions = await Permission.findAll({ where: { id: ids } });
  if (permissions.length !== new Set(ids).size) {
    throw createError(400, 'Algún permiso de permission_ids no existe');
  }
  return permissions;
}

exports.getAll = async (req, res, next) => {
  try {
    const roles = await Role.findAll({ include, order: [['id', 'ASC']] });
    res.status(200).json({ message: 'GET roles obtenido exitosamente', data: roles });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const role = await Role.findByPk(id, { include });
    if (!role) throw createError(404, 'Rol no encontrado');
    res.status(200).json({ message: `GET rol con ID ${id}`, data: role });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.create = async (req, res, next) => {
  try {
    const permissions = await findPermissions(req.body);
    const role = await Role.create(pickFields(req.body, EDITABLE_FIELDS));
    if (permissions) await role.setPermissions(permissions);

    // La base de datos es la fuente de verdad: se recargan los permisos en memoria
    await rbac.loadAccessControl();

    const created = await Role.findByPk(role.id, { include });
    res.status(201).json({ message: 'Rol creado exitosamente', data: created });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const role = await Role.findByPk(id);
    if (!role) throw createError(404, 'Rol no encontrado');

    const changes = pickFields(req.body, EDITABLE_FIELDS);
    const permissions = await findPermissions(req.body);
    if (Object.keys(changes).length === 0 && !permissions) {
      throw createError(400, 'No hay datos válidos para actualizar');
    }

    if (Object.keys(changes).length > 0) await role.update(changes);
    if (permissions) await role.setPermissions(permissions);
    await rbac.loadAccessControl();

    const updated = await Role.findByPk(id, { include });
    res.status(200).json({ message: `Rol con ID ${id} actualizado exitosamente`, data: updated });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const role = await Role.findByPk(id);
    if (!role) throw createError(404, 'Rol no encontrado');

    // Un rol con usuarios asignados no se elimina: esos usuarios se quedarían sin permisos
    const assignedUsers = await User.count({ where: { role_id: id } });
    if (assignedUsers > 0) throw createError(409, `El rol tiene ${assignedUsers} usuario(s) asignado(s)`);

    await role.destroy();
    await rbac.loadAccessControl();
    res.status(200).json({ message: `Rol con ID ${id} eliminado exitosamente` });
  } catch (err) {
    next(toHttpError(err));
  }
};
