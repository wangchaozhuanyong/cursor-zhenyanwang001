const { Router } = require('express');
const ctrl = require('../controller/marketing.controller');

const router = Router();

router.get('/activities/flash-sale', ctrl.getFlashSale);
router.get('/activities/by-position', ctrl.getByPosition);
router.get('/coupon-center', ctrl.getCouponCenter);
router.get('/new-user-gift', ctrl.getNewUserGift);
router.get('/notices', ctrl.getNotices);
router.get('/full-reduction-notices', ctrl.getFullReductionNotices);

module.exports = router;
