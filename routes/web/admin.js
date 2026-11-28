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
router.post('/products/:id/destroy', authenticate, authorize('products', 'delete', 'any'), controller.productsDestroy);

// F9: administración de variantes
router.get('/variants', authenticate, authorize('variants', 'read', 'any'), controller.variantsList);
router.get('/variants/new', authenticate, authorize('variants', 'create', 'any'), controller.variantsNew);
router.post('/variants', authenticate, authorize('variants', 'create', 'any'), controller.variantsCreate);
router.get('/variants/:id/edit', authenticate, authorize('variants', 'update', 'any'), controller.variantsEdit);
router.post('/variants/:id', authenticate, authorize('variants', 'update', 'any'), controller.variantsUpdate);

// F10: inventario
router.get('/inventory', authenticate, authorize('inventory', 'read', 'any'), controller.inventoryList);
router.post('/inventory/:variantId', authenticate, authorize('inventory', 'update', 'any'), controller.inventoryUpdate);

// F11: administración de pedidos
router.get('/orders', authenticate, authorize('orders', 'read', 'any'), controller.ordersList);
router.get('/orders/:id', authenticate, authorize('orders', 'read', 'any'), controller.orderDetail);
router.post('/orders/:id/status', authenticate, authorize('orders', 'update', 'any'), controller.orderUpdateStatus);

// F12: clientes
router.get('/customers', authenticate, authorize('customers', 'read', 'any'), controller.customersList);
router.get('/customers/:id', authenticate, authorize('customers', 'read', 'any'), controller.customerDetail);

// F13: usuarios internos
router.get('/users', authenticate, authorize('users', 'read', 'any'), controller.usersList);
router.get('/users/new', authenticate, authorize('users', 'create', 'any'), controller.usersNew);
router.post('/users', authenticate, authorize('users', 'create', 'any'), controller.usersCreate);
router.get('/users/:id/edit', authenticate, authorize('users', 'update', 'any'), controller.usersEdit);
router.post('/users/:id', authenticate, authorize('users', 'update', 'any'), controller.usersUpdate);
router.post('/users/:id/delete', authenticate, authorize('users', 'delete', 'any'), controller.usersToggleActive);

// F14: roles y permisos
router.get('/roles', authenticate, authorize('roles', 'read', 'any'), controller.rolesList);
router.get('/roles/:id/edit', authenticate, authorize('roles', 'update', 'any'), controller.rolesEdit);
router.post('/roles/:id', authenticate, authorize('roles', 'update', 'any'), controller.rolesUpdate);

module.exports = router;
