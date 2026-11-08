const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

// Formato recurso:acción:alcance, por ejemplo products:delete:any u orders:read:own
const PERMISSION_KEY_FORMAT = /^[a-z][a-z_]*:(create|read|update|delete):(own|any)$/;

const Permission = sequelize.define('Permission', {
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: { is: PERMISSION_KEY_FORMAT }
  },
  description: { type: DataTypes.STRING(255) }
}, {
  tableName: 'permissions',
  timestamps: false
});

module.exports = Permission;