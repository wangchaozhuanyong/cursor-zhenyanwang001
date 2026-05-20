const { Router } = require('express');
const auth = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const ctrl = require('../controller/payments.controller');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');
const {
  listChannelsQuerySchema,
  createIntentBodySchema,
  paymentOrderIdParamSchema,
} = require('../payments.schemas');

const router = Router();

router.use(auth);

router.get('/channels', requireSiteCapability('onlinePaymentEnabled', '本站未启用在线支付'), validate({ query: listChannelsQuerySchema }), ctrl.listChannels);
router.post('/intents', requireSiteCapability('onlinePaymentEnabled', '本站未启用在线支付'), validate({ body: createIntentBodySchema }), ctrl.createIntent);
router.get('/intents/:id', validate({ params: paymentOrderIdParamSchema }), ctrl.getIntent);

module.exports = router;


