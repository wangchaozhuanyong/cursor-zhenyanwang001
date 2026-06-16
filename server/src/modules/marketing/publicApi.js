const marketingService = require('./service/marketing.service');
const promotionRuleEngine = require('./service/promotionRuleEngine.service');
const newUserGiftService = require('./service/newUserGift.service');

module.exports = {
  getFlashSaleForHome: marketingService.getFlashSaleForHome,
  getActivitiesByPosition: marketingService.getActivitiesByPosition,
  getFullReductionNotices: marketingService.getFullReductionNotices,
  getCouponCenter: marketingService.getCouponCenter,
  getCouponZone: marketingService.getCouponZone,
  getNewUserGift: marketingService.getNewUserGift,
  getPromotions: marketingService.getPromotions,
  getPromotionBySlug: marketingService.getPromotionBySlug,
  resolveCheckinReward: marketingService.resolveCheckinReward,
  evaluatePromotionsForCart: promotionRuleEngine.evaluatePromotionsForCart,
  evaluatePricingResult: promotionRuleEngine.evaluatePricingResult,
  issueNewUserGiftPack: newUserGiftService.issueNewUserGiftPack,
};
