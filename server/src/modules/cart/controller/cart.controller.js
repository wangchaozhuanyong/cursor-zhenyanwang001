const { asyncRoute } = require('../../../middleware/asyncRoute');
const cartService = require('../service/cart.service');

function getVariantId(req) {
  const value = req.query.variant_id;
  return typeof value === 'string' ? value : '';
}

exports.getCart = asyncRoute(async (req, res) => {
  res.success(await cartService.getCart(req.user.id));
});

exports.addToCart = asyncRoute(async (req, res) => {
  const r = await cartService.addToCart(req.user.id, req.body);
  res.success(r.data);
});

exports.updateCartItem = asyncRoute(async (req, res) => {
  const r = await cartService.updateCartItem(
    req.user.id,
    req.params.productId,
    req.body,
    getVariantId(req),
  );
  res.success(r.data);
});

exports.removeCartItem = asyncRoute(async (req, res) => {
  const r = await cartService.removeCartItem(req.user.id, req.params.productId, getVariantId(req));
  res.success(null, r.message);
});

exports.clearCart = asyncRoute(async (req, res) => {
  const r = await cartService.clearCart(req.user.id);
  res.success(null, r.message);
});
