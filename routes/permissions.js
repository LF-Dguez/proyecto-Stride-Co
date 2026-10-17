const express = require('express');
const router = express.Router();
const controller = require('../controllers/permissionController');
const authorize = require('../middlewares/authorize');

router.get('/', authorize('permissions', 'read', 'any'), controller.getAll);
router.get('/:id', authorize('permissions', 'read', 'any'), controller.getById);
router.post('/', authorize('permissions', 'create', 'any'), controller.create);
router.put('/:id', authorize('permissions', 'update', 'any'), controller.update);
router.delete('/:id', authorize('permissions', 'delete', 'any'), controller.delete);

module.exports = router;
