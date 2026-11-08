const { toHttpError } = require('../utils/sequelizeHelpers');

const sequelizeError = (name, extra = {}) => Object.assign(new Error(name), { name }, extra);

describe('toHttpError (errores de PostgreSQL)', () => {
  it('violación de llave foránea al eliminar (registro en uso) -> 409', () => {
    const err = sequelizeError('SequelizeForeignKeyConstraintError', {
      parent: { code: '23503', detail: 'Key (id)=(3) is still referenced from table "inventory".' }
    });
    expect(toHttpError(err).status).toBe(409);
  });

  it('violación de llave foránea al insertar (registro relacionado inexistente) -> 400', () => {
    const err = sequelizeError('SequelizeForeignKeyConstraintError', {
      parent: { code: '23503', detail: 'Key (role_id)=(99) is not present in table "roles".' }
    });
    expect(toHttpError(err).status).toBe(400);
  });

  it('error de validación -> 400', () => {
    const err = sequelizeError('SequelizeValidationError', { errors: [{ message: 'name es obligatorio' }] });
    const http = toHttpError(err);
    expect(http.status).toBe(400);
    expect(http.message).toBe('name es obligatorio');
  });

  it('error de base de datos (dato mal formado) -> 400', () => {
    expect(toHttpError(sequelizeError('SequelizeDatabaseError')).status).toBe(400);
  });

  it('un error desconocido se devuelve sin cambios (llegará como 500)', () => {
    const err = new Error('boom');
    expect(toHttpError(err)).toBe(err);
  });
});
