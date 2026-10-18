const createError = require('http-errors');
const { Permission } = require('../models/relationals');
const rbac = require('../services/rbac');
const { parseId, pickFields, toHttpError } = require('../utils/sequelizeHelpers');

const EDITABLE_FIELDS = ['key', 'description'];

// La key debe seguir recurso:accion:alcance (ej. orders:read:own); si no, la
// librería RBAC no podría cargarla, así que se rechaza con 400 antes de guardarla.
function validateKey(fields) {
  if (fields.key === undefined) return;
  try {
    rbac.parsePermissionKey(fields.key);
  } catch (err) {
    throw createError(400, err.message);
  }
}

exports.getAll = async (req, res, next) => {
  try {
    const permissions = await Permission.findAll({ order: [['id', 'ASC']] });
    res.status(200).json({ message: 'GET permisos obtenido exitosamente', data: permissions });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const permission = await Permission.findByPk(id);
    if (!permission) throw createError(404, 'Permiso no encontrado');
    res.status(200).json({ message: `GET permiso con ID ${id}`, data: permission });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.create = async (req, res, next) => {
  try {
    const fields = pickFields(req.body, EDITABLE_FIELDS);
    if (fields.key === undefined) throw createError(400, 'key es obligatoria');
    validateKey(fields);

    const permission = await Permission.create(fields);
    res.status(201).json({ message: 'Permiso creado exitosamente', data: permission });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const permission = await Permission.findByPk(id);
    if (!permission) throw createError(404, 'Permiso no encontrado');

    const changes = pickFields(req.body, EDITABLE_FIELDS);
    if (Object.keys(changes).length === 0) throw createError(400, 'No hay datos válidos para actualizar');
    validateKey(changes);

    await permission.update(changes);
    // Si cambió la key de un permiso asignado, los roles la ven de inmediato
    await rbac.loadAccessControl();
    res.status(200).json({ message: `Permiso con ID ${id} actualizado exitosamente`, data: permission });
  } catch (err) {
    next(toHttpError(err));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const permission = await Permission.findByPk(id);
    if (!permission) throw createError(404, 'Permiso no encontrado');

    // También borra sus filas de role_permission; se recargan los permisos en memoria
    await permission.destroy();
    await rbac.loadAccessControl();
    res.status(200).json({ message: `Permiso con ID ${id} eliminado exitosamente` });
  } catch (err) {
    next(toHttpError(err));
  }
};
