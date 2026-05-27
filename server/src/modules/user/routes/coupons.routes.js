const { Router } = require('express');
const ctrl = require('../controller/coupon.controller');
const auth = require('../../../middleware/auth');
const authOptional = require('../../../middleware/authOptional');
const { guardByAction } = require('../../../middleware/accountStatusGuard');
const { validate } = require('../../../middleware/validate');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');
const { claimCouponBodySchema } = require('../schemas/user.schemas');

const router = Router();

router.use(requireSiteCapability('couponEnabled', '本站未启用优惠券功能'));
router.get('/mine', auth, ctrl.getUserCoupons);
// 可选登录：未登录也可浏览可领取优惠券（会隐藏“新用户/会员专属”等需身份判断的券）
router.get('/available', authOptional, ctrl.getAvailableCoupons);
router.post('/claim', auth, guardByAction('coupon'), validate({ body: claimCouponBodySchema }), ctrl.claimCoupon);

module.exports = router;





