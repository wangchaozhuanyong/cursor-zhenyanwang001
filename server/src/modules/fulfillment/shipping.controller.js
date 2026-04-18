const shippingService = require('./shipping.service');

exports.getTemplates = async (req, res, next) => {
  try {
    const list = await shippingService.getTemplates();
    res.success(list);
  } catch (err) { next(err); }
};

exports.quoteShipping = async (req, res, next) => {
  try {
    const data = await shippingService.quoteShipping(req.body);
    res.success(data);
  } catch (err) { next(err); }
};
