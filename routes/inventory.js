const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventoryController');
const authorize = require('../middlewares/authorize');

router.get('/', authorize('inventory', 'read', 'any'), controller.getAll);
router.get('/:id', authorize('inventory', 'read', 'any'), controller.getById);
router.post('/', authorize('inventory', 'create', 'any'), controller.create);
router.put('/:id', authorize('inventory', 'update', 'any'), controller.update);
router.delete('/:id', authorize('inventory', 'delete', 'any'), controller.delete);

module.exports = router;