const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const authorize = require('../middlewares/authorize');

router.get('/', authorize('users', 'read', 'any'), controller.getAll);
router.get('/:id', authorize('users', 'read', 'any'), controller.getById);
router.post('/', authorize('users', 'create', 'any'), controller.create);
router.put('/:id', authorize('users', 'update', 'any'), controller.update);
router.delete('/:id', authorize('users', 'delete', 'any'), controller.delete);

module.exports = router;
