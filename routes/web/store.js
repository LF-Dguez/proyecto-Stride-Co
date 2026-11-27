const express = require('express');
const router = express.Router();
const controller = require('../../controllers/web/store');

router.get('/', controller.home);
router.get('/products', controller.catalog);

module.exports = router;
