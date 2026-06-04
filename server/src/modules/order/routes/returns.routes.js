const { Router } = require('express');
const ctrl = require('../controller/return.controller');
const auth = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const {
  createReturnBodySchema,
  listReturnsQuerySchema,
  orderIdParamSchema,
  cancelReturnBodySchema,
  returnEvidenceBodySchema,
  returnLogisticsBodySchema,
} = require('../schemas/order.schemas');

const router = Router();

router.get('/', auth, validate({ query: listReturnsQuerySchema }), ctrl.getReturnRequests);
router.get('/:id', auth, validate({ params: orderIdParamSchema }), ctrl.getReturnById);
router.post('/', auth, validate({ body: createReturnBodySchema }), ctrl.createReturn);
router.patch('/:id/cancel', auth, validate({ params: orderIdParamSchema, body: cancelReturnBodySchema }), ctrl.cancelReturn);
router.post('/:id/evidence', auth, validate({ params: orderIdParamSchema, body: returnEvidenceBodySchema }), ctrl.supplementEvidence);
router.post('/:id/logistics', auth, validate({ params: orderIdParamSchema, body: returnLogisticsBodySchema }), ctrl.submitLogistics);
router.post('/:id/confirm', auth, validate({ params: orderIdParamSchema }), ctrl.confirmCompleted);

module.exports = router;
