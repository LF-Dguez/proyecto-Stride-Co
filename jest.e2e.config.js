// Configuración de Jest SOLO para las pruebas E2E (npm run test:e2e).
// Se ejecutan contra la API en ejecución y con bases de datos reales; npm test las ignora.
module.exports = {
  testMatch: ['<rootDir>/test/e2e/**/*.e2e.test.js'],
  globalSetup: '<rootDir>/test/e2e/globalSetup.js',
  testTimeout: 30000,
  maxWorkers: 1 // las suites comparten la misma base de datos: se ejecutan una a una
};
