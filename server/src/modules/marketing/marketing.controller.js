const service = require('./marketing.service');
const { asyncRoute } = require('../../middleware/asyncRoute');

exports.getFlashSale = asyncRoute(async (req, res) => {
  const result = await service.getFlashSaleForHome(req.query);
  res.success(result.data);
});

exports.getByPosition = asyncRoute(async (req, res) => {
  const result = await service.getActivitiesByPosition(req.query);
  res.success(result.data);
});

exports.getCouponCenter = asyncRoute(async (req, res) => {
  const result = await service.getCouponCenter(req.query);
  res.success(result.data);
});

exports.getNewUserGift = asyncRoute(async (req, res) => {
  const result = await service.getNewUserGift(req.query);
  res.success(result.data);
});

exports.getNotices = asyncRoute(async (req, res) => {
  const result = await service.getPositionNotices(req.query);
  res.success(result.data);
});

exports.getFullReductionNotices = asyncRoute(async (req, res) => {
  const result = await service.getFullReductionNotices(req.query);
  res.success(result.data);
});
