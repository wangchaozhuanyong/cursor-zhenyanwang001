const { Router } = require('express');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const ctrl = require('./payments.controller');
const {
  listChannelsQuerySchema,
  createIntentBodySchema,
  paymentOrderIdParamSchema,
} = require('./payments.schemas');

const router = Router();

router.use(auth);

router.get('/channels', validate({ query: listChannelsQuerySchema }), ctrl.listChannels);
router.post('/intents', validate({ body: createIntentBodySchema }), ctrl.createIntent);
router.get('/intents/:id', validate({ params: paymentOrderIdParamSchema }), ctrl.getIntent);

module.exports = router;
