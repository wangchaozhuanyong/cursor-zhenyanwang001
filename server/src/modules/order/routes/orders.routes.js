const { Router } = require('express');
const ctrl = require('../controller/order.controller');
const auth = require('../../../middleware/auth');
const { guardByAction } = require('../../../middleware/accountStatusGuard');
const { validate } = require('../../../middleware/validate');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');
const {
  createOrderBodySchema,
  previewOrderBodySchema,
  checkoutAbandonmentBodySchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  payOrderBodySchema,
} = require('../schemas/order.schemas');

const router = Router();
const mallFeature = requireSiteCapability('mallEnabled', '商城功能已关闭');
const onlinePaymentFeature = requireSiteCapability('onlinePaymentEnabled', '本站未启用在线支付');

function allowWalletOrEnabledOnline(req, res, next) {
  const channel = String(req.body?.channel || '').trim();
  if (channel === 'reward_wallet') return next();
  return onlinePaymentFeature(req, res, next);
}

router.use(auth);
router.use(guardByAction('order'));

router.get('/', validate({ query: listOrdersQuerySchema }), ctrl.getOrders);
router.get('/summary', ctrl.getOrderSummary);
router.post('/checkout-abandonments', validate({ body: checkoutAbandonmentBodySchema }), ctrl.recordCheckoutAbandonment);
router.post('/preview', mallFeature, validate({ body: previewOrderBodySchema }), ctrl.previewOrder);
router.post('/', mallFeature, validate({ body: createOrderBodySchema }), ctrl.createOrder);

router.get('/:id', validate({ params: orderIdParamSchema }), ctrl.getOrderById);
router.post('/:id/cancel', validate({ params: orderIdParamSchema }), ctrl.cancelOrder);
router.post(
  '/:id/stripe-checkout',
  requireSiteCapability('onlinePaymentEnabled', '本站未启用在线支付'),
  validate({ params: orderIdParamSchema }),
  ctrl.createStripeCheckoutSession,
);
router.post(
  '/:id/pay',
  validate({ params: orderIdParamSchema, body: payOrderBodySchema }),
  allowWalletOrEnabledOnline,
  ctrl.payOrder,
);
router.post('/:id/confirm', validate({ params: orderIdParamSchema }), ctrl.confirmReceive);

module.exports = router;

