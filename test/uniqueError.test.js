const { toHttpError } = require('../utils/sequelizeHelpers');

describe('toHttpError: campo único repetido', () => {
  it('SequelizeUniqueConstraintError responde 400', () => {
    const err = new Error('duplicado');
    err.name = 'SequelizeUniqueConstraintError';
    expect(toHttpError(err).status).toBe(400);
  });
});