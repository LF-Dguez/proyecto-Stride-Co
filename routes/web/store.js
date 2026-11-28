const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const { orderOwner } = require('../../services/ownership');
const controller = require('../../controllers/web/store');

router.get('/', controller.home);
router.get('/products', controller.catalog);
router.get('/products/:id', controller.detail);

// F4: bolsa de compra (pública, vive en una cookie)
router.get('/cart', controller.cartView);
router.post('/cart/items', controller.cartAddItem);
router.post('/cart/items/:variantId', controller.cartUpdateItem);
router.post('/cart/items/:variantId/delete', controller.cartRemoveItem);

// F5: checkout y confirmación (exige sesión: el pedido se liga al usuario)
router.get('/checkout', authenticate, authorize('orders', 'create', 'own'), controller.checkoutForm);
router.post('/checkout', authenticate, authorize('orders', 'create', 'own'), controller.checkoutSubmit);
router.get('/my/orders/:id/confirmation', authenticate, authorize('orders', 'read', 'own', orderOwner), controller.orderConfirmation);

// F6: mis pedidos (solo los del usuario autenticado)
router.get('/my/orders', authenticate, authorize('orders', 'read', 'own'), controller.myOrdersList);
router.get('/my/orders/:id', authenticate, authorize('orders', 'read', 'own', orderOwner), controller.myOrderDetail);

module.exports = router;
