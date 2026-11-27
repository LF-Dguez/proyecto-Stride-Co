const express = require('express');
const router = express.Router();
const controller = require('../../controllers/web/store');

router.get('/', controller.home);
router.get('/products', controller.catalog);
router.get('/products/:id', controller.detail);

module.exports = router;
