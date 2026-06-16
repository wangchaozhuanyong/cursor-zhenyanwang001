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

exports.getPromotions = asyncRoute(async (req, res) => {
  const result = await service.getPromotions(req.query);
  res.success(result.data);
});

exports.getPromotionBySlug = asyncRoute(async (req, res) => {
  const result = await service.getPromotionBySlug(req.params.slug, getCurrentUserContext(req));
  if (!result.data) {
    res.status(404).json({ code: 404, message: '活动不存在或已结束', data: null });
    return;
  }
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
