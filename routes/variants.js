const express = require('express');
const router = express.Router();
const controller = require('../controllers/variantController');
const authorize = require('../middlewares/authorize');

router.get('/', authorize('variants', 'read', 'any'), controller.getAll);
router.get('/:id', authorize('variants', 'read', 'any'), controller.getById);
router.post('/', authorize('variants', 'create', 'any'), controller.create);
router.put('/:id', authorize('variants', 'update', 'any'), controller.update);
router.delete('/:id', authorize('variants', 'delete', 'any'), controller.delete);

module.exports = router;