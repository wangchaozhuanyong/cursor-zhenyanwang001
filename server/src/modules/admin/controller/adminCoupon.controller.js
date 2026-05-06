const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminCoupon.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listCoupons(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.create = asyncRoute(async (req, res) => {
  const r = await svc.createCoupon(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.update = asyncRoute(async (req, res) => {
  const r = await svc.updateCoupon(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.remove = asyncRoute(async (req, res) => {
  const r = await svc.deleteCoupon(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.listAllRecords = asyncRoute(async (req, res) => {
  const r = await svc.getAllCouponRecords(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.listRecordsByCoupon = asyncRoute(async (req, res) => {
  const r = await svc.getCouponRecords(req.params.couponId, req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});
