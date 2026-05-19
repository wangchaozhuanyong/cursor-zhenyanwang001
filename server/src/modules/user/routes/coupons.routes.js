const { Router } = require('express');
const ctrl = require('../controller/coupon.controller');
const auth = require('../../../middleware/auth');
const { guardByAction } = require('../../../middleware/accountStatusGuard');
const { validate } = require('../../../middleware/validate');
const { claimCouponBodySchema } = require('../schemas/user.schemas');

const router = Router();

router.get('/mine', auth, ctrl.getUserCoupons);
router.get('/available', auth, ctrl.getAvailableCoupons);
router.post('/claim', auth, guardByAction('coupon'), validate({ body: claimCouponBodySchema }), ctrl.claimCoupon);

module.exports = router;





