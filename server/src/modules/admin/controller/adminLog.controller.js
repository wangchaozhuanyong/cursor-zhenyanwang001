const { asyncRoute } = require('../../../middleware/asyncRoute');
const auditLogService = require('../service/auditLog.service');

exports.listAuditLogs = asyncRoute(async (req, res) => {
  const r = await auditLogService.listAuditLogs(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.listSecurityAlerts = asyncRoute(async (req, res) => {
  const r = await auditLogService.listSecurityAlerts(req.query);
  res.success(r.data, r.message);
});

