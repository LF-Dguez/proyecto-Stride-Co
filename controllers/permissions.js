const createError = require('http-errors');
const { Permission } = require('../models/sql');
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
    res.status(200).json({ message: req.__('permissions.listed'), data: permissions });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const permission = await Permission.findByPk(id);
    if (!permission) throw createError(404, req.__('permissions.notFound'));
    res.status(200).json({ message: req.__('permissions.found', String(id)), data: permission });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.create = async (req, res, next) => {
  try {
    const fields = pickFields(req.body, EDITABLE_FIELDS);
    if (fields.key === undefined) throw createError(400, req.__('permissions.keyRequired'));
    validateKey(fields);

    const permission = await Permission.create(fields);
    res.status(201).json({ message: req.__('permissions.created'), data: permission });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const permission = await Permission.findByPk(id);
    if (!permission) throw createError(404, req.__('permissions.notFound'));

    const changes = pickFields(req.body, EDITABLE_FIELDS);
    if (Object.keys(changes).length === 0) throw createError(400, req.__('common.noValidFields'));
    validateKey(changes);

    await permission.update(changes);
    // Si cambió la key de un permiso asignado, los roles la ven de inmediato
    await rbac.loadAccessControl();
    res.status(200).json({ message: req.__('permissions.updated', String(id)), data: permission });
  } catch (err) {
    next(toHttpError(err, req));
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const permission = await Permission.findByPk(id);
    if (!permission) throw createError(404, req.__('permissions.notFound'));

    // También borra sus filas de role_permission; se recargan los permisos en memoria
    await permission.destroy();
    await rbac.loadAccessControl();
    res.status(200).json({ message: req.__('permissions.deleted', String(id)) });
  } catch (err) {
    next(toHttpError(err, req));
  }
};
