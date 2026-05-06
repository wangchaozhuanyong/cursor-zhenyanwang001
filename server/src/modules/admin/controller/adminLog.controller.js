const { asyncRoute } = require('../../../middleware/asyncRoute');
const adminLogService = require('../adminLog.service');
const auditLogService = require('../auditLog.service');

exports.listAdminLogs = asyncRoute(async (req, res) => {
  const r = await adminLogService.listLogs(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.listAuditLogs = asyncRoute(async (req, res) => {
  const r = await auditLogService.listAuditLogs(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});
