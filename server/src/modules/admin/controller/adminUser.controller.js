const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminUser.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listUsers(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.exportCsv = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportUsersCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
});

exports.getById = asyncRoute(async (req, res) => {
  const r = await svc.getUserById(req.params.id);
  res.success(r.data);
});

exports.update = asyncRoute(async (req, res) => {
  const r = await svc.updateUser(req.params.id, req.body);
  res.success(r.data, r.message);
});

exports.updateSubordinate = asyncRoute(async (req, res) => {
  const r = await svc.updateSubordinate(req.params.id, req.body);
  res.success(r.data, r.message);
});

exports.adjustPoints = asyncRoute(async (req, res) => {
  const r = await svc.adjustUserPoints(req.params.userId, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});
