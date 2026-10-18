// Variables de entorno SOLO para las pruebas (Jest las carga antes de cada archivo de prueba).
// Son valores de prueba: nunca se usan fuera de Jest ni sustituyen al .env real.
process.env.JWT_SECRET = 'secreto-solo-para-pruebas-jest-no-usar-en-produccion';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_ISSUER = 'stride-co';
process.env.JWT_AUDIENCE = 'stride-co-api';
process.env.BCRYPT_SALT_ROUNDS = '4'; // costo bajo para que las pruebas sean rápidas
