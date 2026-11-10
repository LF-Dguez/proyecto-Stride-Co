const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

// Cada combinación de color y talla de un producto
const ProductVariant = sequelize.define('ProductVariant', {
  sku: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { notEmpty: true } },
  color: { type: DataTypes.STRING(30) },
  size: { type: DataTypes.STRING(20) },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'product_variants',
  timestamps: true
});

module.exports = ProductVariant;