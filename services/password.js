const bcrypt = require('bcrypt');

const DEFAULT_SALT_ROUNDS = 10;

// Factor de costo desde BCRYPT_SALT_ROUNDS; si falta o es inválido se usa un valor seguro por defecto
function getSaltRounds() {
  const rounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
  return Number.isInteger(rounds) && rounds >= 4 && rounds <= 31 ? rounds : DEFAULT_SALT_ROUNDS;
}

/**
 * Genera un salt NUEVO y el hash de la contraseña. Ambos deben guardarse y regenerarse juntos.
 *   password -> genSalt(rounds) -> salt_key -> hash(password, salt_key) -> password_hash
 */
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new TypeError('La contraseña es obligatoria');
  }
  const salt_key = await bcrypt.genSalt(getSaltRounds());
  const password_hash = await bcrypt.hash(password, salt_key);
  return { password_hash, salt_key };
}

// Compara con bcrypt.compare (nunca se vuelve a calcular el hash para usar ===)
async function verifyPassword(password, passwordHash) {
  if (typeof password !== 'string' || typeof passwordHash !== 'string' || passwordHash.length === 0) {
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}

module.exports = { hashPassword, verifyPassword, getSaltRounds };
