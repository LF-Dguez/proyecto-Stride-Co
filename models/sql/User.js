const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const User = sequelize.define('User', {
  first_name: { type: DataTypes.STRING(100), allowNull: false },
  last_name: { type: DataTypes.STRING(100), allowNull: false },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  // Contraseña protegida con bcrypt: el hash incluye el costo y el salt; salt_key guarda el salt generado
  password_hash: { type: DataTypes.STRING(100), allowNull: false },
  salt_key: { type: DataTypes.STRING(100), allowNull: false }
}, {
  tableName: 'users',
  timestamps: true // created_at, updated_at
});

// Campos que NUNCA deben salir en una respuesta de la API (ni en un JWT)
const SENSITIVE_FIELDS = ['password', 'password_hash', 'salt_key'];

User.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  SENSITIVE_FIELDS.forEach((field) => delete values[field]);
  return values;
};

module.exports = User;
