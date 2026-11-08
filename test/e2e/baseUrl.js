const config = require('config');

// URL de la API a probar: e2e.baseUrl de la configuración (por defecto http://localhost:3000).
// E2E_BASE_URL se permite SOLO aquí, para apuntar la misma suite al despliegue de Render:
//   E2E_BASE_URL=https://<servicio>.onrender.com npm run test:e2e
function getBaseUrl() {
  return (process.env.E2E_BASE_URL || config.get('e2e.baseUrl')).replace(/\/+$/, '');
}

module.exports = { getBaseUrl };
