const jwt = require('jsonwebtoken');
const config = require('config');

const REQUIRED = ['jwt.secret', 'jwt.expiresIn', 'jwt.issuer', 'jwt.audience'];

// Toda la configuración sale de config (jwt.secret en config/local-<entorno>.json); si falta alguna no se firma el token
function getJwtConfig() {
  const missing = REQUIRED.filter((key) => !config.has(key) || !config.get(key));
  if (missing.length > 0) {
    throw new Error(`Configuración JWT incompleta, faltan: ${missing.join(', ')}`);
  }
  return {
    secret: config.get('jwt.secret'),
    expiresIn: config.get('jwt.expiresIn'),
    issuer: config.get('jwt.issuer'),
    audience: config.get('jwt.audience')
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
