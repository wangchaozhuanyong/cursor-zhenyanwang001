const { Router } = require('express');
const ctrl = require('../controller/marketing.controller');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');
const authOptional = require('../../../middleware/authOptional');

const router = Router();

router.get('/activities/flash-sale', ctrl.getFlashSale);
router.get('/activities/by-position', ctrl.getByPosition);
router.get('/coupon-center', authOptional, requireSiteCapability('couponEnabled', '本站未启用优惠券功能'), ctrl.getCouponCenter);
router.get('/coupon-zone', authOptional, requireSiteCapability('couponEnabled', '本站未启用优惠券功能'), ctrl.getCouponZone);
router.get('/new-user-gift', authOptional, requireSiteCapability('couponEnabled', '本站未启用优惠券功能'), ctrl.getNewUserGift);
router.get('/notices', ctrl.getNotices);
router.get('/full-reduction-notices', ctrl.getFullReductionNotices);

module.exports = router;
