const { Router } = require('express');
const ctrl = require('./shipping.controller');
const { validate } = require('../../middleware/validate');
const { shippingQuoteBodySchema } = require('./schemas/user.schemas');

const router = Router();

router.get('/', ctrl.getTemplates);
router.post('/quote', validate({ body: shippingQuoteBodySchema }), ctrl.quoteShipping);

module.exports = router;
