const { Router } = require('express');
const ctrl = require('./order.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  createOrderBodySchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  payOrderBodySchema,
} = require('./schemas/order.schemas');

const router = Router();

router.use(auth);

router.get('/', validate({ query: listOrdersQuerySchema }), ctrl.getOrders);
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
