const createError = require('http-errors');
const { User } = require('../models/relationals');
const { hashPassword } = require('../services/password');

const MIN_PASSWORD_LENGTH = 8;
const EDITABLE_FIELDS = ['first_name', 'last_name', 'email', 'role_id', 'active'];

function pickFields(body) {
  const fields = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) fields[field] = body[field];
  });
  return fields;
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw createError(400, 'ID inválido');
  return id;
}

function handleError(err, next) {
  if (err.name === 'SequelizeUniqueConstraintError') {
    return next(createError(409, 'El email ya está registrado'));
  }
  if (err.name === 'SequelizeValidationError') {
    return next(createError(400, err.errors?.[0]?.message || 'Datos inválidos'));
  }
  return next(err);
}

exports.getAll = async (req, res, next) => {
  try {
    const users = await User.findAll({ order: [['id', 'ASC']] });
    res.status(200).json({ message: 'GET usuarios obtenido exitosamente', data: users });
  } catch (err) {
    handleError(err, next);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const user = await User.findByPk(id);
    if (!user) throw createError(404, 'Usuario no encontrado');
    res.status(200).json({ message: `GET usuario con ID ${id}`, data: user });
  } catch (err) {
    handleError(err, next);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password } = req.body || {};
    if (!first_name || !last_name || !email) {
      throw createError(400, 'first_name, last_name y email son obligatorios');
    }
    if (!isValidPassword(password)) {
      throw createError(400, `La contraseña es obligatoria (mínimo ${MIN_PASSWORD_LENGTH} caracteres)`);
    }

    const { password_hash, salt_key } = await hashPassword(password);
    const user = await User.create({ ...pickFields(req.body), password_hash, salt_key });

    res.status(201).json({ message: 'Usuario creado exitosamente', data: user });
  } catch (err) {
    handleError(err, next);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const user = await User.findByPk(id);
    if (!user) throw createError(404, 'Usuario no encontrado');

    const body = req.body || {};
    const changes = pickFields(body);

    if (body.password !== undefined) {
      if (!isValidPassword(body.password)) {
        throw createError(400, `La contraseña debe tener mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
      }
      Object.assign(changes, await hashPassword(body.password));
    }

    if (Object.keys(changes).length === 0) {
      throw createError(400, 'No hay datos válidos para actualizar');
    }

    await user.update(changes);
    res.status(200).json({ message: `Usuario con ID ${id} actualizado exitosamente`, data: user });
  } catch (err) {
    handleError(err, next);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const user = await User.findByPk(id);
    if (!user) throw createError(404, 'Usuario no encontrado');

    await user.destroy();
    res.status(200).json({ message: `Usuario con ID ${id} eliminado exitosamente` });
  } catch (err) {
    handleError(err, next);
  }
};