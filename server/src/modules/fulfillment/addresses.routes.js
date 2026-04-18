const { Router } = require('express');
const ctrl = require('./address.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/', auth, ctrl.getAddresses);
router.post('/', auth, ctrl.createAddress);
router.put('/:id', auth, ctrl.updateAddress);
router.delete('/:id', auth, ctrl.deleteAddress);
router.put('/:id/default', auth, ctrl.setDefault);

module.exports = router;
