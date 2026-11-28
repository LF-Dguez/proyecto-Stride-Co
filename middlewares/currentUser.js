const jwt = require('jsonwebtoken');
const config = require('config');
const { User } = require('../models/sql');
const { getAccessControl, getRoleName } = require('../services/rbac');

// can(recurso, accion, alcance) disponible en las vistas (res.locals.can) para
// mostrar u ocultar menús y botones según los permisos reales del usuario, tal
// como pide la sección 4.7 del Entregable 3. Ocultar un botón no sustituye a
// authorize en la ruta: esto es solo para no ofrecer en el menú algo a lo que
// de todas formas respondería 403.
function buildCan(user) {
  return (resource, action, possession = 'any') => {
    if (!user) return false;
    const ac = getAccessControl();
    const role = getRoleName(user);
    if (!ac || !role || !ac.hasRole(role)) return false;
    return ac.can(role)[`${action}${possession === 'own' ? 'Own' : 'Any'}`](resource).granted;
  };
}

// A diferencia de authenticate (que exige sesión y corta con 401 si falta o es
// inválida), este middleware es opcional: intenta identificar al usuario desde
// la cookie access_token para que las vistas públicas (el header de la tienda)
// puedan mostrar "Iniciar sesión" o el nombre de quien ya inició sesión, pero
// nunca bloquea la petición si no hay cookie o está vencida/corrupta.
module.exports = async function currentUser(req, res, next) {
  try {
    const token = req.cookies && req.cookies.access_token;
    if (!token) { res.locals.can = buildCan(null); return next(); }

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
    res.locals.can = buildCan(req.user);
    next();
  } catch {
    res.locals.can = buildCan(null);
    next();
  }
};
