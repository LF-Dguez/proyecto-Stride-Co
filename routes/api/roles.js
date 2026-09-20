var express = require('express');
var router = express.Router();
var controller = require('../../controllers/rolesController');

router.get('/', controller.list);
router.get('/:id', controller.getRole);
router.post('/', controller.createRole);
router.put('/:id', controller.updateRole);
router.delete('/:id', controller.removeRole);

module.exports = router;