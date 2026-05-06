const { Router } = require('express');
const ctrl = require('./address.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  addressIdParamSchema,
  createAddressBodySchema,
  updateAddressBodySchema,
} = require('./schemas/user.schemas');

const router = Router();

router.get('/', auth, ctrl.getAddresses);
router.post('/', auth, validate({ body: createAddressBodySchema }), ctrl.createAddress);
router.put(
  '/:id',
  auth,
  validate({ params: addressIdParamSchema, body: updateAddressBodySchema }),
  ctrl.updateAddress,
);
router.delete('/:id', auth, validate({ params: addressIdParamSchema }), ctrl.deleteAddress);
router.put('/:id/default', auth, validate({ params: addressIdParamSchema }), ctrl.setDefault);

module.exports = router;
