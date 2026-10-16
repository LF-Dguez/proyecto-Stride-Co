const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Product = sequelize.define('Product', {
  // Aún no existe el modelo Category; se guarda solo el id
  category_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  brand: { type: DataTypes.STRING(100) },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'products',
  timestamps: true
});

module.exports = Product;
