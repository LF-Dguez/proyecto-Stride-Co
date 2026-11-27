const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const controller = require('../../controllers/web/admin');

// orders:read:any lo tienen admin y sales, pero no user (clientes): sirve como
// la entrada mínima al panel sin validar por nombre de rol (prohibido, ver
// sección 4.7). Cada sección exige además su propio permiso (products:*:any,
// orders:*:any, ...), igual que la API.
router.get('/', authenticate, authorize('orders', 'read', 'any'), controller.dashboard);

// F8: administración de productos
router.get('/products', authenticate, authorize('products', 'read', 'any'), controller.productsList);
router.get('/products/new', authenticate, authorize('products', 'create', 'any'), controller.productsNew);
router.post('/products', authenticate, authorize('products', 'create', 'any'), controller.productsCreate);
router.get('/products/:id/edit', authenticate, authorize('products', 'update', 'any'), controller.productsEdit);
router.post('/products/:id', authenticate, authorize('products', 'update', 'any'), controller.productsUpdate);
router.post('/products/:id/delete', authenticate, authorize('products', 'delete', 'any'), controller.productsToggleActive);

// F11: administración de pedidos
router.get('/orders', authenticate, authorize('orders', 'read', 'any'), controller.ordersList);
router.get('/orders/:id', authenticate, authorize('orders', 'read', 'any'), controller.orderDetail);
router.post('/orders/:id/status', authenticate, authorize('orders', 'update', 'any'), controller.orderUpdateStatus);

module.exports = router;
