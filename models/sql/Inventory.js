const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

// Stock de una variante (un registro por variante); reserved = unidades apartadas
const Inventory = sequelize.define('Inventory', {
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 }
  },
  reserved: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 }
  }
}, {
  tableName: 'inventory',
  timestamps: true
});

module.exports = Inventory;