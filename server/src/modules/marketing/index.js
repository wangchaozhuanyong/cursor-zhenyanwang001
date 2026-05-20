const { Router } = require('express');
const marketingRoutes = require('./routes/marketing.routes');
const marketingService = require('./service/marketing.service');

const router = Router();
router.use('/marketing', marketingRoutes);

/** @type {any} */ (router).api = {
  getFlashSaleForHome: marketingService.getFlashSaleForHome,
  getActivitiesByPosition: marketingService.getActivitiesByPosition,
  getFullReductionNotices: marketingService.getFullReductionNotices,
  getCouponCenter: marketingService.getCouponCenter,
  getNewUserGift: marketingService.getNewUserGift,
};

module.exports = router;
