const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');

// Público: no lleva authenticate ni authorize.
router.post('/login', controller.login);

// Protegido: requiere Bearer token válido.
router.get('/me', authenticate, controller.me);

module.exports = router;
