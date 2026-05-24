const { asyncRoute } = require('../../../middleware/asyncRoute');
function getLoyaltyApi() {
  return /** @type {any} */ (require('../../loyalty')).api || {};
}

exports.listGifts = asyncRoute(async (_req, res) => {
  const data = await getLoyaltyApi().listActiveGiftItems();
  res.success(data);
});

exports.getGift = asyncRoute(async (req, res) => {
  const data = await getLoyaltyApi().getGiftItem(String(req.params.id));
  res.success(data.data);
});

exports.redeemGift = asyncRoute(async (req, res) => {
  const data = await getLoyaltyApi().redeemGift(req.user.id, req.body);
  res.success(data.data, data.message);
});
