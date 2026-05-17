const { Router } = require('express');
const ctrl = require('./order.controller');
const auth = require('../../middleware/auth');
const { guardByAction } = require('../../middleware/accountStatusGuard');
const { validate } = require('../../middleware/validate');
const {
  createOrderBodySchema,
  previewOrderBodySchema,
  checkoutAbandonmentBodySchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  payOrderBodySchema,
} = require('./schemas/order.schemas');

const router = Router();

router.use(auth);
router.use(guardByAction('order'));

router.get('/', validate({ query: listOrdersQuerySchema }), ctrl.getOrders);
router.get('/summary', ctrl.getOrderSummary);
router.post('/checkout-abandonments', validate({ body: checkoutAbandonmentBodySchema }), ctrl.recordCheckoutAbandonment);
router.post('/preview', validate({ body: previewOrderBodySchema }), ctrl.previewOrder);
router.post('/', validate({ body: createOrderBodySchema }), ctrl.createOrder);

router.get('/:id', validate({ params: orderIdParamSchema }), ctrl.getOrderById);
router.post('/:id/cancel', validate({ params: orderIdParamSchema }), ctrl.cancelOrder);
router.post(
  '/:id/stripe-checkout',
  validate({ params: orderIdParamSchema }),
  ctrl.createStripeCheckoutSession,
);
router.post(
  '/:id/pay',
  validate({ params: orderIdParamSchema, body: payOrderBodySchema }),
  ctrl.payOrder,
);
router.post('/:id/confirm', validate({ params: orderIdParamSchema }), ctrl.confirmReceive);

module.exports = router;
