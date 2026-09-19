var express = require('express');
var router = express.Router();
var controller = require('../../controllers/inventoryController');

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);

module.exports = router;
