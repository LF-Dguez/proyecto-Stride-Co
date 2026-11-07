const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

// Stock disponible de una variante (un registro por variante)
const Inventory = sequelize.define('Inventory', {
  stock: {
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
