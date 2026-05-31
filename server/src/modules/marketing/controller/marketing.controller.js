const service = require('../service/marketing.service');
const { asyncRoute } = require('../../../middleware/asyncRoute');

function getCurrentUserContext(req) {
  return {
    userId: req.user?.id ? String(req.user.id) : null,
  };
}

exports.getFlashSale = asyncRoute(async (req, res) => {
  const result = await service.getFlashSaleForHome(req.query);
  res.success(result.data);
});

exports.getByPosition = asyncRoute(async (req, res) => {
  const result = await service.getActivitiesByPosition(req.query);
  res.success(result.data);
});

exports.getCouponCenter = asyncRoute(async (req, res) => {
  const result = await service.getCouponCenter(req.query, getCurrentUserContext(req));
  res.success(result.data);
});

exports.getCouponZone = asyncRoute(async (req, res) => {
  const result = await service.getCouponZone(req.query, getCurrentUserContext(req));
  res.success(result.data);
});

exports.getNewUserGift = asyncRoute(async (req, res) => {
  const result = await service.getNewUserGift(req.query, getCurrentUserContext(req));
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
