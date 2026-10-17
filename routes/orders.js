const express = require('express');
const router = express.Router();
const controller = require('../controllers/orderController');
const authorize = require('../middlewares/authorize');

// own en GET / no lleva resolver: la lista se acota dentro del controller.
// own en :id sí lleva resolver: resuelve la orden concreta contra su dueño real.
router.get('/', authorize('orders', 'read', 'own'), controller.getAll);
router.get('/:id', authorize('orders', 'read', 'own', controller.resolveOwner), controller.getById);
router.post('/', authorize('orders', 'create', 'any'), controller.create);
router.put('/:id', authorize('orders', 'update', 'own', controller.resolveOwner), controller.update);
router.delete('/:id', authorize('orders', 'delete', 'any'), controller.delete);

module.exports = router;
