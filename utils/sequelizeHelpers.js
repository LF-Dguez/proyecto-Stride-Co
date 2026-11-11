const createError = require('http-errors');

// Traduce con req.__() cuando el llamador ya pasa req (recursos migrados a i18n);
// si no, conserva el texto en español que ya tenía el helper, para no romper a los
// controllers que todavía no se migran (ver issues #98/#99).
function t(req, key, fallback) {
  return req && typeof req.__ === 'function' ? req.__(key) : fallback;
}

// Convierte :id en número entero positivo; si no lo es responde 400 (no 500).
function parseId(value, req) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw createError(400, t(req, 'common.invalidId', 'ID inválido'));
  return id;
}

// Copia solo los campos permitidos del body (evita que el cliente cambie id, fechas, etc.)
function pickFields(body, allowed) {
  const fields = {};
  allowed.forEach((field) => {
    if (body && body[field] !== undefined) fields[field] = body[field];
  });
  return fields;
}

// Traduce los errores de Sequelize a errores HTTP en vez de dejarlos caer como 500
function toHttpError(err, req) {
  switch (err.name) {
    case 'SequelizeValidationError':
      return createError(400, err.errors?.[0]?.message || t(req, 'common.invalidData', 'Datos inválidos'));
    case 'SequelizeUniqueConstraintError':
      return createError(400, t(req, 'common.duplicateRecord', 'El registro ya existe'));
    case 'SequelizeForeignKeyConstraintError': {
      // PostgreSQL usa el código 23503 tanto al insertar/actualizar (el registro relacionado
      // no existe) como al eliminar (otros registros todavía dependen de este). Se distinguen
      // por el detalle: "... is still referenced from table ...".
      const detail = err.parent?.detail || '';
      return /still referenced/i.test(detail)
        ? createError(409, t(req, 'common.recordInUse', 'El registro está en uso por otros registros'))
        : createError(400, t(req, 'common.relatedRecordMissing', 'El registro relacionado no existe'));
    }
    case 'SequelizeDatabaseError':
      return createError(400, t(req, 'common.invalidData', 'Datos inválidos'));
    default:
      return err;
  }
}

module.exports = { parseId, pickFields, toHttpError };
