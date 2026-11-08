const { getBaseUrl } = require('./baseUrl');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Espera a que la API responda en /health antes de correr las suites. El plan gratuito de Render
// duerme el servicio sin tráfico y tarda alrededor de un minuto en despertar.
async function waitForApi({ timeoutMs = 90000, intervalMs = 3000, fetchFn = fetch } = {}) {
  const url = `${getBaseUrl()}/health`;
  const deadline = Date.now() + timeoutMs;
  let lastError = 'sin respuesta';

  while (Date.now() < deadline) {
    try {
      const response = await fetchFn(url);
      if (response.status === 200) return url;
      lastError = `respondió ${response.status}`;
    } catch (error) {
      lastError = error.cause?.code || error.message;
    }
    await sleep(intervalMs);
  }
  throw new Error(
    `La API no responde en ${url} (${lastError}). Levántala con "npm start" (con PostgreSQL y MongoDB ` +
    'corriendo) o define E2E_BASE_URL con la URL del despliegue.'
  );
}

module.exports = async () => {
  await waitForApi();
};
module.exports.waitForApi = waitForApi;
