const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

// Cada combinación de color y talla de un producto
const ProductVariant = sequelize.define('ProductVariant', {
  sku: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  color: { type: DataTypes.STRING(50) },
  size: { type: DataTypes.STRING(10) },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'product_variants',
  timestamps: true
});

module.exports = ProductVariant;
