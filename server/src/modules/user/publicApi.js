const pointsService = require('./service/points.service');
const rewardService = require('./service/reward.service');
const notificationService = require('./service/notification.service');
const memberLevelService = require('./service/memberLevel.service');
const { UserStatsService } = require('./service/userStats.service');
const uploadRouteService = require('./service/uploadRoute.service');
const uploadPresignRouteService = require('./service/uploadPresignRoute.service');
const uploadAssetService = require('./service/uploadAsset.service');
const couponAdminIssueService = require('./service/couponAdminIssue.service');
const couponService = require('./service/coupon.service');
const couponLifecycle = require('./service/couponLifecycle.service');

module.exports = {
  settleOrderPoints: pointsService.settleOrderPoints,
  reverseOrderPoints: pointsService.reverseOrderPoints,
  settleOrderRewards: rewardService.settleOrderRewards,
  maybeSettleOrderRewardsOnPayment: rewardService.maybeSettleOrderRewardsOnPayment,
  reverseOrderRewards: rewardService.reverseOrderRewards,
  sumRewardTransactionsBalance: rewardService.sumRewardTransactionsBalance,
  insertRewardTransaction: rewardService.insertRewardTransaction,
  adjustUserPoints: pointsService.adjustUserPoints,
  awardConfiguredPointsBonus: pointsService.awardConfiguredPointsBonus,
  awardConfiguredPointsBonusForUser: pointsService.awardConfiguredPointsBonusForUser,
  getAdminPointsRecords: pointsService.getAdminRecords,
  changeUserPoints: pointsService.changeUserPoints,
  changePoints: pointsService.changePoints,
  insertUserNotification: notificationService.insertUserNotification,
  refreshUserMemberLevel: memberLevelService.refreshUserMemberLevel,
  getUserMemberLevel: memberLevelService.getUserMemberLevel,
  normalizeMemberLevel: memberLevelService.normalizeLevel,
  syncStatsAfterOrderPaid: UserStatsService.syncStatsAfterOrderPaid,
  syncStatsAfterRefund: UserStatsService.syncStatsAfterRefund,
  syncStatsAfterOrderCancelled: UserStatsService.syncStatsAfterOrderCancelled,
  uploadMiddleware: uploadRouteService.uploadMiddleware,
  uploadMultiple: uploadRouteService.uploadMultiple,
  uploadFile: uploadRouteService.uploadFile,
  uploadFiles: uploadRouteService.uploadFiles,
  createUploadTicket: uploadPresignRouteService.createTicket,
  completeUpload: uploadPresignRouteService.completeUpload,
  recordUploadedAsset: uploadAssetService.recordUploadedAsset,
  safeRecordUploadedAsset: uploadAssetService.safeRecordUploadedAsset,
  selectPendingVideoTranscodeAssets: uploadAssetService.selectPendingVideoTranscodeAssets,
  claimVideoTranscodeAsset: uploadAssetService.claimVideoTranscodeAsset,
  markVideoTranscodeReady: uploadAssetService.markVideoTranscodeReady,
  markVideoTranscodeFailed: uploadAssetService.markVideoTranscodeFailed,
  replaceProductVideoUrl: uploadAssetService.replaceProductVideoUrl,
  getAdminRewardRecords: rewardService.getAdminRecords,
  issueCouponToUsers: couponAdminIssueService.issueCouponToUsers,
  getAvailableCoupons: couponService.getAvailableCoupons,
  getCouponCenter: couponService.getCouponCenter,
  decorateCouponsWithClaimability: couponService.decorateCouponsWithClaimability,
  buildEffectiveCoupon: couponLifecycle.buildEffectiveCoupon,
  resolveUserCouponRuntimeStatus: couponLifecycle.resolveUserCouponRuntimeStatus,
  restoreCouponAfterOrderCancelled: couponLifecycle.restoreCouponAfterOrderCancelled,
  selectUserCouponsPage: couponService.selectUserCouponsPage,
  selectCheckoutCandidateUserCoupons: couponService.selectCheckoutCandidateUserCoupons,
  selectUserPointsBalance: pointsService.selectUserPointsBalance,
  hasPendingReverse: pointsService.hasPendingReverse,
  sumUserRewardTransactions: rewardService.sumUserRewardTransactions,
  selectSuccessLedgerForUser: pointsService.selectSuccessLedgerForUser,
  selectUserIdsWithPositiveBalance: pointsService.selectUserIdsWithPositiveBalance,
  getPointsConnection: pointsService.getPointsConnection,
  selectPointsRecordByRelatedForUpdate: pointsService.selectPointsRecordByRelatedForUpdate,
};
