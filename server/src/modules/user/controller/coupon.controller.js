const couponService = require('../service/coupon.service');

exports.getUserCoupons = async (req, res, next) => {
  try {
    const { list, total, page, pageSize } = await couponService.getUserCoupons(req.user.id, req.query);
    res.paginate(list, total, page, pageSize);
  } catch (err) { next(err); }
};

exports.getAvailableCoupons = async (req, res, next) => {
  try {
    const userId = req.user?.id ? String(req.user.id) : null;
    const list = await couponService.getAvailableCoupons(userId);
    res.success(list);
  } catch (err) { next(err); }
};

exports.getCouponCenter = async (req, res, next) => {
  try {
    const userId = req.user?.id ? String(req.user.id) : null;
    const data = await couponService.getCouponCenter(userId);
    res.success(data);
  } catch (err) { next(err); }
};

exports.claimCoupon = async (req, res, next) => {
  try {
    const result = await couponService.claimCoupon(req.user.id, req.body);
    if (result.error) return res.fail(result.error.code, result.error.message, { reason: result.error.reason });
    res.success(result.data, result.message);
  } catch (err) { next(err); }
};


