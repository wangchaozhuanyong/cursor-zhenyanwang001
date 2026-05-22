const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../../loyalty/service/pointsGiftRedemption.service');

exports.listGifts = asyncRoute(async (_req, res) => {
  const data = await svc.listActiveGiftItems();
  res.success(data);
});

exports.getGift = asyncRoute(async (req, res) => {
  const data = await svc.getGiftItem(String(req.params.id));
  res.success(data.data);
});

exports.redeemGift = asyncRoute(async (req, res) => {
  const data = await svc.redeemGift(req.user.id, req.body);
  res.success(data.data, data.message);
});
