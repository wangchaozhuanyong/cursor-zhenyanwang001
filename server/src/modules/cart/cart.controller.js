const { asyncRoute } = require('../../middleware/asyncRoute');
const cartService = require('./cart.service');

exports.getCart = asyncRoute(async (req, res) => {
  res.success(await cartService.getCart(req.user.id));
});

exports.addToCart = asyncRoute(async (req, res) => {
  const r = await cartService.addToCart(req.user.id, req.body);
  res.success(r.data);
});

exports.updateCartItem = asyncRoute(async (req, res) => {
  const r = await cartService.updateCartItem(req.user.id, req.params.productId, req.body);
  res.success(r.data);
});

exports.removeCartItem = asyncRoute(async (req, res) => {
  const r = await cartService.removeCartItem(req.user.id, req.params.productId);
  res.success(null, r.message);
});

exports.clearCart = asyncRoute(async (req, res) => {
  const r = await cartService.clearCart(req.user.id);
  res.success(null, r.message);
});
