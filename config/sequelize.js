const { Sequelize } = require('sequelize');
const config = require('config');

// Conexión a PostgreSQL. La URI (con usuario y contraseña) es un secreto: sale de
// config/local-<entorno>.json (fuera de git). Render PostgreSQL pide SSL cuando se usa
// la External Database URL: se activa con postgres.ssl = true.
const uri = config.get('postgres.uri');
const useSsl = config.get('postgres.ssl');

const sequelize = new Sequelize(uri, {
  dialect: 'postgres',
  logging: false,
  define: {
    // createdAt -> created_at, roleId -> role_id
    underscored: true
  },
  dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {}
});

module.exports = sequelize;
