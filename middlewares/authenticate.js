const { expressjwt } = require('express-jwt');
const createError = require('http-errors');
const { User } = require('../models/relationals');

// Verifica la firma, expiración, issuer y audience del Bearer token; deja el
// payload decodificado en req.auth (req.auth.sub = id del usuario, ver
// services/token.js). Si falta, está mal firmado o expiró, llama a next(err)
// con un UnauthorizedError (status 401) que atrapa el manejador de errores
// genérico de app.js.
const checkToken = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE
});

// Carga al usuario real a partir de req.auth.sub y lo deja en req.user con el
// contrato { id, role_id, ... } que ya esperan authorize() y
// services/rbac.js#getRoleName (ver README, "Contrato de req.user").
async function loadUser(req, res, next) {
  try {
    const id = Number(req.auth && req.auth.sub);
    const user = await User.findByPk(id);
    if (!user || !user.active) {
      return next(createError(401, 'Usuario no autorizado'));
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
