const { Router } = require('express');
const publicApi = require('./publicApi');

const router = Router();

/** Public module API for payment consumers. */
/** @type {any} */ (router).api = publicApi;

router.use('/payment', require('./routes/paymentPublic.routes'));
router.use('/payments', require('./routes/payments.webhook.routes'));
router.use('/payments', require('./routes/payments.routes'));

module.exports = router;
