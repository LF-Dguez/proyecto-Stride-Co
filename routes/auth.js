const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');

// Público: no lleva authenticate ni authorize.
router.post('/login', controller.login);

module.exports = router;
