const { Router } = require('express');
const ctrl = require('../controller/coupon.controller');
const auth = require('../../../middleware/auth');
const authOptional = require('../../../middleware/authOptional');
const { guardByAction } = require('../../../middleware/accountStatusGuard');
const { validate } = require('../../../middleware/validate');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');
const { claimCouponBodySchema } = require('../schemas/user.schemas');

const router = Router();

router.use(requireSiteCapability('couponEnabled', '本站未启用礼券功能'));
router.get('/center', authOptional, ctrl.getCouponCenter);
router.get('/mine', auth, ctrl.getUserCoupons);
router.get('/available', authOptional, ctrl.getAvailableCoupons);
router.post('/claim', auth, guardByAction('coupon'), validate({ body: claimCouponBodySchema }), ctrl.claimCoupon);

module.exports = router;
