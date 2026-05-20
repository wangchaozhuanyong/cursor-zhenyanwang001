/**
 * User 鍩燂細浼氬憳璧勬枡銆佹敹钘忎笌娴忚鍘嗗彶銆佸湴鍧€涓庤繍璐癸紙璇伙級銆佽惀閿€鐗规潈銆佺珯鍐呴€氱煡銆佷笂浼? */
const { Router } = require('express');
const pointsService = require('./service/points.service');
const rewardService = require('./service/reward.service');
const notificationService = require('./service/notification.service');
const memberLevelService = require('./service/memberLevel.service');
const { UserStatsService } = require('./service/userStats.service');

const router = Router();

router.use('/user', require('./routes/user.routes'));
router.use('/me', require('./routes/me.routes'));
router.use('/favorites', require('./routes/favorites.routes'));
router.use('/history', require('./routes/history.routes'));
router.use('/addresses', require('./routes/addresses.routes'));
router.use('/shipping', require('./routes/shipping.routes'));
router.use('/notifications', require('./routes/notifications.routes'));
router.use('/coupons', require('./routes/coupons.routes'));
router.use('/points', require('./routes/points.routes'));
router.use('/rewards', require('./routes/rewards.routes'));
router.use('/invite', require('./routes/invite.routes'));
router.use('/upload', require('./routes/upload.routes'));
router.use('/theme', require('./routes/theme.routes'));

// Cross-module public API (do not import internal files directly from other modules)
/** @type {any} */ (router).api = {
  settleOrderPoints: pointsService.settleOrderPoints,
  reverseOrderPoints: pointsService.reverseOrderPoints,
  settleOrderRewards: rewardService.settleOrderRewards,
  reverseOrderRewards: rewardService.reverseOrderRewards,
  sumRewardTransactionsBalance: rewardService.sumRewardTransactionsBalance,
  insertRewardTransaction: rewardService.insertRewardTransaction,
  adjustUserPoints: pointsService.adjustUserPoints,
  changeUserPoints: pointsService.changeUserPoints,
  changePoints: pointsService.changePoints,
  insertUserNotification: notificationService.insertUserNotification,
  refreshUserMemberLevel: memberLevelService.refreshUserMemberLevel,
  getUserMemberLevel: memberLevelService.getUserMemberLevel,
  normalizeMemberLevel: memberLevelService.normalizeLevel,
  syncStatsAfterOrderPaid: UserStatsService.syncStatsAfterOrderPaid,
  syncStatsAfterRefund: UserStatsService.syncStatsAfterRefund,
  syncStatsAfterOrderCancelled: UserStatsService.syncStatsAfterOrderCancelled,
};

module.exports = router;




