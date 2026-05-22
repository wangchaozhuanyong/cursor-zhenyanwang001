const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminPointsGift.service');

exports.listGiftItems = asyncRoute(async (req, res) => {
  const data = await svc.listGiftItems(req.query);
  res.success(data);
});

exports.createGiftItem = asyncRoute(async (req, res) => {
  const data = await svc.createGiftItem(req.body);
  res.success(data.data, data.message);
});

exports.updateGiftItem = asyncRoute(async (req, res) => {
  const data = await svc.updateGiftItem(String(req.params.id), req.body);
  res.success(data.data, data.message);
});

exports.deleteGiftItem = asyncRoute(async (req, res) => {
  const data = await svc.deleteGiftItem(String(req.params.id));
  res.success(data.data, data.message);
});

exports.listRedemptions = asyncRoute(async (req, res) => {
  const data = await svc.listRedemptions(req.query);
  res.success(data);
});
