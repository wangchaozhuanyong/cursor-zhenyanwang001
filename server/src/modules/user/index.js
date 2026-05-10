/**
 * User 域：会员资料、收藏与浏览历史、地址与运费（读）、营销特权、站内通知、上传
 */
const { Router } = require('express');
const pointsService = require('./points.service');
const rewardService = require('./reward.service');
const notificationService = require('./notification.service');
const memberLevelService = require('./memberLevel.service');

const router = Router();

router.use('/user', require('./user.routes'));
router.use('/favorites', require('./favorites.routes'));
router.use('/history', require('./history.routes'));
router.use('/addresses', require('./addresses.routes'));
router.use('/shipping', require('./shipping.routes'));
router.use('/notifications', require('./notifications.routes'));
router.use('/coupons', require('./coupons.routes'));
router.use('/points', require('./points.routes'));
router.use('/rewards', require('./rewards.routes'));
router.use('/invite', require('./invite.routes'));
router.use('/upload', require('./upload.routes'));
router.use('/theme', require('./theme.routes'));

// Cross-module public API (do not import internal files directly from other modules)
/** @type {any} */ (router).api = {
  settleOrderPoints: pointsService.settleOrderPoints,
  reverseOrderPoints: pointsService.reverseOrderPoints,
  settleOrderRewards: rewardService.settleOrderRewards,
  reverseOrderRewards: rewardService.reverseOrderRewards,
  sumRewardTransactionsBalance: rewardService.sumRewardTransactionsBalance,
  insertRewardTransaction: rewardService.insertRewardTransaction,
  adjustUserPoints: pointsService.adjustUserPoints,
  insertUserNotification: notificationService.insertUserNotification,
  refreshUserMemberLevel: memberLevelService.refreshUserMemberLevel,
  getUserMemberLevel: memberLevelService.getUserMemberLevel,
};

module.exports = router;
