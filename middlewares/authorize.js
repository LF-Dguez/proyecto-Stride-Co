const createError = require('http-errors');
const { getAccessControl, getRoleName } = require('../services/rbac');

/**
 * Middleware reutilizable de autorización (RBAC).
 *   authorize(resource, action, possession, ownerResolver?)
 *
 * - 'any': exige el permiso recurso:accion:any.
 * - 'own': acepta recurso:accion:any (alcance mayor) o recurso:accion:own. Con solo 'own', si se da
 *   ownerResolver, se compara el propietario real del recurso con el usuario autenticado.
 *
 * Deja en req.rbac.possession ('any' | 'own') el alcance con el que se concedió el acceso,
 * para que el controller acote la consulta sin tomar decisiones de autorización.
 *
 * 401: no hay usuario autenticado (lo resuelve la autenticación existente).  403: sin permiso.
 */
function authorize(resource, action, possession = 'any', ownerResolver) {
  return async (req, res, next) => {
    try {
      if (!req.user) return next(createError(401, 'No autenticado'));

      const ac = getAccessControl();
      const role = getRoleName(req.user);
      if (!ac || !role || !ac.hasRole(role)) return next(createError(403, 'Acceso denegado'));

      const can = ac.can(role);

      if (can[`${action}Any`](resource).granted) {
        req.rbac = { possession: 'any' };
        return next();
      }

      if (possession === 'own' && can[`${action}Own`](resource).granted) {
        if (ownerResolver) {
          const ownerId = await ownerResolver(req);
          if (ownerId === null || ownerId === undefined || String(ownerId) !== String(req.user.id)) {
            return next(createError(403, 'Acceso denegado'));
          }
        }
        req.rbac = { possession: 'own' };
        return next();
      }

      return next(createError(403, 'Acceso denegado'));
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = authorize;
