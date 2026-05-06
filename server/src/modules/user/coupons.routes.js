const { Router } = require('express');
const ctrl = require('./coupon.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { claimCouponBodySchema } = require('./schemas/user.schemas');

const router = Router();

router.get('/mine', auth, ctrl.getUserCoupons);
router.get('/available', auth, ctrl.getAvailableCoupons);
router.post('/claim', auth, validate({ body: claimCouponBodySchema }), ctrl.claimCoupon);

module.exports = router;
