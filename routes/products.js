const express = require('express');
const router = express.Router();
const controller = require('../controllers/productController');
const authorize = require('../middlewares/authorize');


router.get('/', authorize('products', 'read', 'any'), controller.getAll);
router.get('/:id', authorize('products', 'read', 'any'), controller.getById);
router.post('/', authorize('products', 'create', 'any'), controller.create);
router.put('/:id', authorize('products', 'update', 'any'), controller.update);
router.delete('/:id', authorize('products', 'delete', 'any'), controller.delete);


module.exports = router;