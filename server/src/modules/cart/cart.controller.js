const cartService = require('./cart.service');

exports.getCart = async (req, res, next) => {
  try {
    const list = await cartService.getCart(req.user.id);
    res.success(list);
  } catch (err) { next(err); }
};

exports.addToCart = async (req, res, next) => {
  try {
    const result = await cartService.addToCart(req.user.id, req.body);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(result.data);
  } catch (err) { next(err); }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const result = await cartService.updateCartItem(req.user.id, req.params.productId, req.body);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(result.data);
  } catch (err) { next(err); }
};

exports.removeCartItem = async (req, res, next) => {
  try {
    const { message } = await cartService.removeCartItem(req.user.id, req.params.productId);
    res.success(null, message);
  } catch (err) { next(err); }
};

exports.clearCart = async (req, res, next) => {
  try {
    const { message } = await cartService.clearCart(req.user.id);
    res.success(null, message);
  } catch (err) { next(err); }
};
