const { Router } = require('express');
const ctrl = require('./order.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.use(auth);
router.get('/', ctrl.getOrders);
router.post('/', ctrl.createOrder);
router.get('/:id', ctrl.getOrderById);
router.post('/:id/cancel', ctrl.cancelOrder);
router.post('/:id/stripe-checkout', ctrl.createStripeCheckoutSession);
router.post('/:id/pay', ctrl.payOrder);
router.post('/:id/confirm', ctrl.confirmReceive);

module.exports = router;
