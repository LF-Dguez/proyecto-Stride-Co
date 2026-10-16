require('dotenv').config({ quiet: true });
const { Sequelize } = require('sequelize');

// Conexión a MySQL. Los datos salen del archivo .env (ver .env.example).
const sequelize = new Sequelize(
  process.env.DB_NAME || 'stride_co',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    define: {
      // createdAt -> created_at, roleId -> role_id
      underscored: true
    }
  }
);

module.exports = sequelize;
