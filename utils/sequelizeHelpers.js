const createError = require('http-errors');

// Convierte :id en número entero positivo; si no lo es responde 400 (no 500).
function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw createError(400, 'ID inválido');
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
function toHttpError(err) {
  switch (err.name) {
    case 'SequelizeValidationError':
      return createError(400, err.errors?.[0]?.message || 'Datos inválidos');
    case 'SequelizeUniqueConstraintError':
      return createError(409, 'El registro ya existe');
    case 'SequelizeForeignKeyConstraintError':
      // Al insertar/actualizar: el registro relacionado no existe.
      // Al eliminar: otros registros todavía dependen de este.
      return err.parent?.code === 'ER_ROW_IS_REFERENCED_2'
        ? createError(409, 'El registro está en uso por otros registros')
        : createError(400, 'El registro relacionado no existe');
    case 'SequelizeDatabaseError':
      return createError(400, 'Datos inválidos');
    default:
      return err;
  }
}

module.exports = { parseId, pickFields, toHttpError };
