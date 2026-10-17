const express = require('express');
const router = express.Router();
const controller = require('../controllers/customerController');
const authorize = require('../middlewares/authorize');

router.get('/', authorize('customers', 'read', 'own'), controller.getAll);
router.get('/:id', authorize('customers', 'read', 'own', controller.resolveOwner), controller.getById);
router.post('/', authorize('customers', 'create', 'any'), controller.create);
router.put('/:id', authorize('customers', 'update', 'own', controller.resolveOwner), controller.update);
router.delete('/:id', authorize('customers', 'delete', 'any'), controller.delete);

module.exports = router;
