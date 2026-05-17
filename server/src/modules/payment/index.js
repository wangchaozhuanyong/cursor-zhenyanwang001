const { Router } = require('express');

const router = Router();

/** 须在挂载子路由之前注册，避免 payment ↔ order 循环依赖时 api 尚未就绪 */
/** @type {any} */ (router).api = {
  payWithRewardWallet: (...args) => require('./payments.service').payWithRewardWallet(...args),
  createStripeCheckoutForOrder: (...args) =>
    require('./payments.service').createStripeCheckoutForOrder(...args),
  recordRefundByAdmin: (...args) => require('./payments.service').recordRefundByAdmin(...args),
};

router.use('/payment', require('./paymentPublic.routes'));
router.use('/payments', require('./payments.webhook.routes'));
router.use('/payments', require('./payments.routes'));

module.exports = router;
