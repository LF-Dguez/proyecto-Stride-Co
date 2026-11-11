const createError = require('http-errors');
const { User, Role } = require('../models/sql');
const { hashPassword } = require('../services/password');

const MIN_PASSWORD_LENGTH = 8;
const EDITABLE_FIELDS = ['first_name', 'last_name', 'email', 'role_id', 'active'];
const include = [{ model: Role, as: 'role', attributes: ['id', 'name', 'description'] }];

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

function parseId(value, req) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw createError(400, req.__('common.invalidId'));
  return id;
}

function handleError(err, req, next) {
  if (err.name === 'SequelizeUniqueConstraintError') {
    return next(createError(400, req.__('users.emailTaken')));
  }
  if (err.name === 'SequelizeValidationError') {
    return next(createError(400, err.errors?.[0]?.message || req.__('common.invalidData')));
  }
  return next(err);
}

exports.getAll = async (req, res, next) => {
  try {
    const users = await User.findAll({ include, order: [['id', 'ASC']] });
    res.status(200).json({ message: req.__('users.listed'), data: users });
  } catch (err) {
    handleError(err, req, next);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const user = await User.findByPk(id, { include });
    if (!user) throw createError(404, req.__('users.notFound'));
    res.status(200).json({ message: req.__('users.found', String(id)), data: user });
  } catch (err) {
    handleError(err, req, next);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password } = req.body || {};
    if (!first_name || !last_name || !email) {
      throw createError(400, req.__('users.nameEmailRequired'));
    }
    if (!isValidPassword(password)) {
      throw createError(400, req.__('users.passwordRequired', String(MIN_PASSWORD_LENGTH)));
    }

    const { password_hash, salt_key } = await hashPassword(password);
    const user = await User.create({ ...pickFields(req.body), password_hash, salt_key });

    res.status(201).json({ message: req.__('users.created'), data: user });
  } catch (err) {
    handleError(err, req, next);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const user = await User.findByPk(id);
    if (!user) throw createError(404, req.__('users.notFound'));

    const body = req.body || {};
    const changes = pickFields(body);

    if (body.password !== undefined) {
      if (!isValidPassword(body.password)) {
        throw createError(400, req.__('users.passwordMinLength', String(MIN_PASSWORD_LENGTH)));
      }
      Object.assign(changes, await hashPassword(body.password));
    }

    if (Object.keys(changes).length === 0) {
      throw createError(400, req.__('common.noValidFields'));
    }

    await user.update(changes);
    res.status(200).json({ message: req.__('users.updated', String(id)), data: user });
  } catch (err) {
    handleError(err, req, next);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, req);
    const user = await User.findByPk(id);
    if (!user) throw createError(404, req.__('users.notFound'));

    await user.destroy();
    res.status(200).json({ message: req.__('users.deleted', String(id)) });
  } catch (err) {
    handleError(err, req, next);
  }
};
