const jwt = require('jsonwebtoken');
const config = require('config');
const { User } = require('../models/sql');

// A diferencia de authenticate (que exige sesión y corta con 401 si falta o es
// inválida), este middleware es opcional: intenta identificar al usuario desde
// la cookie access_token para que las vistas públicas (el header de la tienda)
// puedan mostrar "Iniciar sesión" o el nombre de quien ya inició sesión, pero
// nunca bloquea la petición si no hay cookie o está vencida/corrupta.
module.exports = async function currentUser(req, res, next) {
  try {
    const token = req.cookies && req.cookies.access_token;
    if (!token) return next();

    const payload = jwt.verify(token, config.get('jwt.secret'), {
      algorithms: ['HS256'],
      issuer: config.get('jwt.issuer'),
      audience: config.get('jwt.audience')
    });
    const user = await User.findByPk(Number(payload.sub));
    if (user && user.active) {
      req.user = user;
      res.locals.currentUser = user;
    }
    next();
  } catch {
    next();
  }
};
