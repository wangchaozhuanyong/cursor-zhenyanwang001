const { Router } = require('express');
const ctrl = require('./return.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  createReturnBodySchema,
  listReturnsQuerySchema,
  orderIdParamSchema,
} = require('./schemas/order.schemas');

const router = Router();

router.get('/', auth, validate({ query: listReturnsQuerySchema }), ctrl.getReturnRequests);
router.get('/:id', auth, validate({ params: orderIdParamSchema }), ctrl.getReturnById);
router.post('/', auth, validate({ body: createReturnBodySchema }), ctrl.createReturn);

module.exports = router;
