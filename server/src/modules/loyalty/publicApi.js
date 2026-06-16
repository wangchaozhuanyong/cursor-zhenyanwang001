const loyaltyService = require('./service/loyalty.service');
const pointsGiftAdmin = require('./service/pointsGiftAdmin.service');
const pointsExpire = require('./service/pointsExpire.service');
const pointsEngine = require('./service/pointsEngine.service');
const pointsBonusResolver = require('./service/pointsBonusResolver.service');
const loyaltyRepo = require('./repository/loyalty.repository');
const pointsGiftRedemption = require('./service/pointsGiftRedemption.service');
const pointsLoyaltyHints = require('./service/pointsLoyaltyHints');

module.exports = {
  getLoyaltyConfig: loyaltyService.getLoyaltyConfig,
  listGiftItemsAdmin: pointsGiftAdmin.listGiftItems,
  createGiftItemAdmin: pointsGiftAdmin.createGiftItem,
  updateGiftItemAdmin: pointsGiftAdmin.updateGiftItem,
  deleteGiftItemAdmin: pointsGiftAdmin.deleteGiftItem,
  listGiftRedemptionsAdmin: pointsGiftAdmin.listRedemptions,
  runPointsExpireTick: pointsExpire.runPointsExpireTick,
  normalizePointsSettings: pointsEngine.normalizeSettings,
  pointsMoney: pointsEngine.money,
  calculateMaxUsablePoints: pointsEngine.calculateMaxUsablePoints,
  calculateOrderEarnedPoints: pointsEngine.calculateOrderEarnedPoints,
  POINTS_CALCULATION_VERSION: pointsEngine.CALCULATION_VERSION,
  resolvePointsBonusForPricing: pointsBonusResolver.resolvePointsBonusForPricing,
  selectPointsSettings: loyaltyRepo.selectPointsSettings,
  selectRewardSettings: loyaltyRepo.selectRewardSettings,
  selectProductRules: loyaltyRepo.selectProductRules,
  selectUserMemberLevel: loyaltyRepo.selectUserMemberLevel,
  getOrderPointsHint: pointsLoyaltyHints.getOrderPointsHint,
  listActiveGiftItems: pointsGiftRedemption.listActiveGiftItems,
  getGiftItem: pointsGiftRedemption.getGiftItem,
  redeemGift: pointsGiftRedemption.redeemGift,
  syncGiftRedemptionOnOrderPaid: pointsGiftRedemption.syncGiftRedemptionOnOrderPaid,
  finalizeGiftOrderFulfillment: pointsGiftRedemption.finalizeGiftOrderFulfillment,
  reverseGiftRedemptionForCancelledOrder: pointsGiftRedemption.reverseGiftRedemptionForCancelledOrder,
};
