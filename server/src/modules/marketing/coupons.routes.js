const { Router } = require('express');
const ctrl = require('./coupon.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/mine', auth, ctrl.getUserCoupons);
router.get('/available', auth, ctrl.getAvailableCoupons);
router.post('/claim', auth, ctrl.claimCoupon);

module.exports = router;
