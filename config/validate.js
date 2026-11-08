const config = require('config');

// Configuración sin la cual la API no puede funcionar: los secretos (jwt.secret y las URIs
// de las bases de datos) vienen de config/local-<entorno>.json, que no está en git.
const REQUIRED = ['jwt.secret', 'jwt.expiresIn', 'jwt.issuer', 'jwt.audience', 'postgres.uri', 'mongo.uri'];

function getMissingConfig() {
  return REQUIRED.filter((key) => {
    if (!config.has(key)) return true;
    const value = config.get(key);
    return value === null || value === undefined || value === '';
  });
}

// Lanza un error con un mensaje claro; bin/www lo muestra y detiene el arranque.
function assertRequiredConfig() {
  const missing = getMissingConfig();
  if (missing.length === 0) return;
  const env = config.util.getEnv('NODE_ENV');
  throw new Error(
    `Falta configuración obligatoria: ${missing.join(', ')}. ` +
    `Crea config/local-${env}.json a partir de config/local-development.example.json ` +
    '(ese archivo contiene secretos y no se sube a git).'
  );
}

module.exports = { REQUIRED, getMissingConfig, assertRequiredConfig };
