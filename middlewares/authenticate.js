const { expressjwt } = require('express-jwt');
const config = require('config');
const createError = require('http-errors');
const { User } = require('../models/sql');

// Verifica la firma, expiración, issuer y audience del token; deja el payload
// decodificado en req.auth (req.auth.sub = id del usuario, ver services/token.js).
// Si falta, está mal firmado o expiró, llama a next(err) con un UnauthorizedError
// (status 401) que atrapa el manejador de errores genérico de app.js (que en las
// rutas web redirige a /login, ver sección 4.7 del Entregable 3).
// El token viaja en el header Authorization (API) o en la cookie access_token
// (vistas web, que no pueden mandar headers al navegar entre páginas).
const checkToken = expressjwt({
  secret: config.get('jwt.secret'),
  algorithms: ['HS256'],
  issuer: config.get('jwt.issuer'),
  audience: config.get('jwt.audience'),
  getToken: (req) => (req.cookies && req.cookies.access_token) || req.headers.authorization?.replace(/^Bearer\s+/, '')
});

// Carga al usuario real a partir de req.auth.sub y lo deja en req.user con el
// contrato { id, role_id, ... } que ya esperan authorize() y
// services/rbac.js#getRoleName (ver README, "Contrato de req.user").
async function loadUser(req, res, next) {
  try {
    const id = Number(req.auth && req.auth.sub);
    const user = await User.findByPk(id);
    if (!user || !user.active) {
      return next(createError(401, req.__('common.unauthorized')));
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Se exporta como arreglo: Express acepta una lista de middlewares en
// router.use()/get()/etc., así que authenticate puede montarse como una sola
// unidad sin perder el manejo de errores entre los dos pasos.
module.exports = [checkToken, loadUser];
