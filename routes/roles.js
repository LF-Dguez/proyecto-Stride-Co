const express = require('express');
const router = express.Router();
const controller = require('../controllers/roleController');
const authorize = require('../middlewares/authorize');

router.get('/', authorize('roles', 'read', 'any'), controller.getAll);
router.get('/:id', authorize('roles', 'read', 'any'), controller.getById);
router.post('/', authorize('roles', 'create', 'any'), controller.create);
router.put('/:id', authorize('roles', 'update', 'any'), controller.update);
router.delete('/:id', authorize('roles', 'delete', 'any'), controller.delete);

module.exports = router;
