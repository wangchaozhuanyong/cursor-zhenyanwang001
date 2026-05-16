const { Router } = require('express');
const paymentsService = require('./payments.service');

const router = Router();

router.use('/payment', require('./paymentPublic.routes'));
router.use('/payments', require('./payments.webhook.routes'));
router.use('/payments', require('./payments.routes'));

/** @type {any} */ (router).api = {
  payWithRewardWallet: paymentsService.payWithRewardWallet,
  createStripeCheckoutForOrder: paymentsService.createStripeCheckoutForOrder,
};

module.exports = router;
