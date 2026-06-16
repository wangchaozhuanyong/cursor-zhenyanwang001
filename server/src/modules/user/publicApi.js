const pointsService = require('./service/points.service');
const rewardService = require('./service/reward.service');
const notificationService = require('./service/notification.service');
const memberLevelService = require('./service/memberLevel.service');
const { UserStatsService } = require('./service/userStats.service');
const uploadCtrl = require('./controller/upload.controller');
const uploadPresignCtrl = require('./controller/uploadPresign.controller');
const uploadAssetService = require('./service/uploadAsset.service');
const uploadAssetRepo = require('./repository/uploadAsset.repository');
const couponAdminIssueService = require('./service/couponAdminIssue.service');
const couponService = require('./service/coupon.service');
const couponLifecycle = require('./service/couponLifecycle.service');
const couponRepo = require('./repository/coupon.repository');
const pointsRepo = require('./repository/points.repository');
const rewardRepo = require('./repository/reward.repository');

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
  uploadMiddleware: uploadCtrl.uploadMiddleware,
  uploadMultiple: uploadCtrl.uploadMultiple,
  uploadFile: uploadCtrl.uploadFile,
  uploadFiles: uploadCtrl.uploadFiles,
  createUploadTicket: uploadPresignCtrl.createTicket,
  completeUpload: uploadPresignCtrl.completeUpload,
  recordUploadedAsset: uploadAssetService.recordUploadedAsset,
  safeRecordUploadedAsset: uploadAssetService.safeRecordUploadedAsset,
  selectPendingVideoTranscodeAssets: uploadAssetRepo.selectPendingVideoTranscodeAssets,
  claimVideoTranscodeAsset: uploadAssetRepo.claimVideoTranscodeAsset,
  markVideoTranscodeReady: uploadAssetRepo.markVideoTranscodeReady,
  markVideoTranscodeFailed: uploadAssetRepo.markVideoTranscodeFailed,
  replaceProductVideoUrl: uploadAssetRepo.replaceProductVideoUrl,
  getAdminRewardRecords: rewardService.getAdminRecords,
  issueCouponToUsers: couponAdminIssueService.issueCouponToUsers,
  getAvailableCoupons: couponService.getAvailableCoupons,
  getCouponCenter: couponService.getCouponCenter,
  decorateCouponsWithClaimability: couponService.decorateCouponsWithClaimability,
  buildEffectiveCoupon: couponLifecycle.buildEffectiveCoupon,
  resolveUserCouponRuntimeStatus: couponLifecycle.resolveUserCouponRuntimeStatus,
  restoreCouponAfterOrderCancelled: couponLifecycle.restoreCouponAfterOrderCancelled,
  selectUserCouponsPage: couponRepo.selectUserCouponsPage,
  selectCheckoutCandidateUserCoupons: couponRepo.selectCheckoutCandidateUserCoupons,
  selectUserPointsBalance: pointsRepo.selectUserPointsBalance,
  hasPendingReverse: pointsRepo.hasPendingReverse,
  sumUserRewardTransactions: rewardRepo.sumUserRewardTransactions,
  selectSuccessLedgerForUser: pointsRepo.selectSuccessLedgerForUser,
  selectUserIdsWithPositiveBalance: pointsRepo.selectUserIdsWithPositiveBalance,
  getPointsConnection: pointsRepo.getConnection,
  selectPointsRecordByRelatedForUpdate: pointsRepo.selectRecordByRelatedForUpdate,
};
