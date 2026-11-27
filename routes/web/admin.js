const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const controller = require('../../controllers/web/admin');

// orders:read:any lo tienen admin y sales, pero no user (clientes): sirve como
// la entrada mínima al panel sin validar por nombre de rol (prohibido, ver
// sección 4.7). Cada sección propia (F8, F11, ...) exige además su propio permiso.
router.get('/', authenticate, authorize('orders', 'read', 'any'), controller.dashboard);

module.exports = router;
