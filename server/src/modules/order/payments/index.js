/**
 * Order 域下的支付入口（路由挂载与模块 API）。
 */
const { Router } = require('express');
const paymentsService = require('./payments.service');

const router = Router();

router.use(require('./payments.webhook.routes'));
router.use(require('./payments.routes'));

router.api = {
  payWithRewardWallet: paymentsService.payWithRewardWallet,
  createStripeCheckoutForOrder: paymentsService.createStripeCheckoutForOrder,
};

module.exports = router;
