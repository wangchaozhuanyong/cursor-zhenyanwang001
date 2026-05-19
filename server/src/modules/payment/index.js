const { Router } = require('express');

const router = Router();

/** 须在挂载子路由之前注册，避免 payment ? order 循环依赖时 api 尚未就绪 */
/** @type {any} */ (router).api = {
  payWithRewardWallet: (...args) => require('./service/payments.service').payWithRewardWallet(...args),
  createStripeCheckoutForOrder: (...args) =>
    require('./service/payments.service').createStripeCheckoutForOrder(...args),
  recordRefundByAdmin: (...args) => require('./service/payments.service').recordRefundByAdmin(...args),
};

router.use('/payment', require('./routes/paymentPublic.routes'));
router.use('/payments', require('./routes/payments.webhook.routes'));
router.use('/payments', require('./routes/payments.routes'));

module.exports = router;

