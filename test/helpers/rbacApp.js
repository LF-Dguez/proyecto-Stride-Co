// Utilidades de prueba RBAC. No requieren MySQL ni MongoDB.
//
// Contrato de req.user (issue #45): mientras no exista JWT (Actividad 4),
// authorize() y los controllers esperan req.user = { id, role_id } (igual
// que el modelo User de Sequelize) o, como atajo en pruebas, { id, role }
// con el nombre del rol directo. services/rbac.js#getRoleName() acepta
// cualquiera de las dos formas. Este helper simula ese contrato con un
// header (x-test-user) para no depender de un middleware de autenticación
// real todavía.
const express = require('express');
const { ROLE_PERMISSIONS } = require('../../seeders/rbacMatrix');
const { buildAccessControl, setAccessControl } = require('../../services/rbac');

// Filas equivalentes a Role + role_permission + Permission, tomadas de la matriz sembrada
const permissionRows = Object.entries(ROLE_PERMISSIONS)
  .flatMap(([role, keys]) => keys.map((key) => ({ role, key })));

// Usuarios de prueba (simulan lo que deja la autenticación existente en req.user)
const as = (role, id) => ({ 'x-test-user': JSON.stringify({ id, role }) });
const users = {
  admin: as('admin', 1),
  sales: as('sales', 2),
  user: as('user', 10),
  otherUser: as('user', 20)
};

// App mínima: simula la autenticación, carga los permisos y deja montar los routers a probar
function buildApp(mount) {
  setAccessControl(buildAccessControl(permissionRows));
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const header = req.get('x-test-user');
    if (header) req.user = JSON.parse(header);
    next();
  });
  mount(app);
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: { message: err.message, status: err.status || 500 } });
  });
  return app;
}

module.exports = { permissionRows, buildApp, users };
