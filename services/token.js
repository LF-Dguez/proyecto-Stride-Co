const jwt = require('jsonwebtoken');

const REQUIRED = ['JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_ISSUER', 'JWT_AUDIENCE'];

// Toda la configuración sale de variables de entorno; si falta alguna no se firma el token
function getJwtConfig() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Configuración JWT incompleta, faltan: ${missing.join(', ')}`);
  }
  return {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE
  };
}

/**
 * Firma el JWT de un usuario autenticado.
 * El payload contiene ÚNICAMENTE `sub` (id del usuario): nada de password, hash, salt ni rol.
 */
function signToken(user) {
  const { secret, expiresIn, issuer, audience } = getJwtConfig();
  return jwt.sign({ sub: String(user.id) }, secret, {
    expiresIn,
    issuer,
    audience,
    algorithm: 'HS256'
  });
}

module.exports = { signToken, getJwtConfig };
