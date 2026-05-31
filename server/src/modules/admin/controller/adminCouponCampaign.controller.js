const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminCouponCampaign.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listCampaigns(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.getById = asyncRoute(async (req, res) => {
  const r = await svc.getCampaign(req.params.id);
  res.success(r.data);
});

exports.create = asyncRoute(async (req, res) => {
  const r = await svc.createCampaign(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.update = asyncRoute(async (req, res) => {
  const r = await svc.updateCampaign(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.updateStatus = asyncRoute(async (req, res) => {
  const r = await svc.updateCampaignStatus(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.remove = asyncRoute(async (req, res) => {
  const r = await svc.deleteCampaign(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});
