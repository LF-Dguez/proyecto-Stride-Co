const express = require('express');
const router = express.Router();
const controller = require('../controllers/orderController');
const authorize = require('../middlewares/authorize');
const { orderOwner } = require('../services/ownership');

// own en GET / no lleva resolver: la lista se acota con el filtro de services/ownership.js.
// own en :id sí lleva resolver: resuelve la orden concreta contra su dueño real.
router.get('/', authorize('orders', 'read', 'own'), controller.getAll);
router.get('/:id', authorize('orders', 'read', 'own', orderOwner), controller.getById);
router.post('/', authorize('orders', 'create', 'any'), controller.create);
router.put('/:id', authorize('orders', 'update', 'own', orderOwner), controller.update);
router.delete('/:id', authorize('orders', 'delete', 'any'), controller.delete);

module.exports = router;
