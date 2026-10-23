require('dotenv').config({ quiet: true });
const { Sequelize } = require('sequelize');
const config = require('config');

const mysqlConfig = config.get("mysql");

// Conexión a MySQL. El .env (ver .env.example) tiene prioridad; si no, se usa
// config/<NODE_ENV>.json (con config/default.json como base).
const database = process.env.DB_NAME || mysqlConfig.database;

const sequelize = new Sequelize(
  database,
  process.env.DB_USER || mysqlConfig.user,
  process.env.DB_PASSWORD ?? mysqlConfig.password,
  {
    host: process.env.DB_HOST || mysqlConfig.host,
    port: Number(process.env.DB_PORT) || mysqlConfig.port,
    dialect: 'mysql',
    logging: false,
    define: {
      // createdAt -> created_at, roleId -> role_id
      underscored: true
    }
  }
);

console.log("app conectada a " + database);

module.exports = sequelize;
