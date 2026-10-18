const { User } = require('../models/relationals');
const { verifyPassword } = require('../services/password');
const { signToken } = require('../services/token');

// Mismo mensaje genérico en todos los casos de fallo: email inexistente, usuario
// inactivo o contraseña incorrecta. No revela cuáles cuentas están registradas.
const INVALID_CREDENTIALS = { message: 'Invalid credentials' };

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'email y password son obligatorios' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.active || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json(INVALID_CREDENTIALS);
    }

    // El payload del JWT solo lleva sub (ver services/token.js); user se serializa
    // con User.prototype.toJSON(), que ya oculta password_hash y salt_key.
    const token = signToken(user);
    res.status(200).json({ message: 'Login exitoso', token, user });
  } catch (err) {
    next(err);
  }
};

// req.user ya lo deja listo el middleware authenticate (ver middlewares/authenticate.js).
// Se responde con la instancia tal cual: toJSON() oculta password_hash y salt_key.
exports.me = (req, res) => {
  res.status(200).json(req.user);
};
