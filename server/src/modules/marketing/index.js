/**
 * Marketing 域：优惠券、积分、奖励金、邀请
 */
const { Router } = require('express');

const router = Router();

router.use('/coupons', require('./coupons.routes'));
router.use('/points', require('./points.routes'));
router.use('/rewards', require('./rewards.routes'));
router.use('/invite', require('./invite.routes'));

module.exports = router;
