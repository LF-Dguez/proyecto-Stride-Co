const sequelize = require('../../config/sequelize');
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const Product = require('./Product');
const ProductVariant = require('./ProductVariant');
const Inventory = require('./Inventory');

// Un rol tiene muchos usuarios; cada usuario pertenece a un rol (users.role_id)
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// Muchos a muchos: roles <-> permisos mediante la tabla role_permission
Role.belongsToMany(Permission, {
  through: 'role_permission',
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'permissions',
  timestamps: false
});
Permission.belongsToMany(Role, {
  through: 'role_permission',
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  as: 'roles',
  timestamps: false
});

// Un producto tiene muchas variantes (product_variants.product_id)
Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Uno a uno: cada variante tiene un solo registro de inventario (inventory.variant_id)
ProductVariant.hasOne(Inventory, { foreignKey: { name: 'variant_id', unique: true }, as: 'inventory' });
Inventory.belongsTo(ProductVariant, { foreignKey: { name: 'variant_id', unique: true }, as: 'variant' });

module.exports = { sequelize, User, Role, Permission, Product, ProductVariant, Inventory };
