const { asyncRoute } = require('../../../middleware/asyncRoute');
const service = require('../service/backup.service');

exports.overview = asyncRoute(async (_req, res) => {
  res.success(await service.getOverview());
});

exports.listFiles = asyncRoute(async (req, res) => {
  const r = await service.listBackupFiles(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.createFullBackup = asyncRoute(async (req, res) => {
  res.success(await service.createFullBackup({
    req,
    userId: req.user.id,
    reason: req.body?.reason || 'manual',
  }));
});

exports.listRestoreJobs = asyncRoute(async (req, res) => {
  const r = await service.listRestoreJobs(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.createRestoreJob = asyncRoute(async (req, res) => {
  res.success(await service.createRestoreJob({ req, userId: req.user.id, body: req.body || {} }));
});

exports.approveRestoreJob = asyncRoute(async (req, res) => {
  res.success(await service.approveRestoreJob({ req, userId: req.user.id, restoreJobId: req.params.id }));
});

exports.listDrillReports = asyncRoute(async (req, res) => {
  res.success(await service.listDrillReports(req.query));
});

exports.listAlerts = asyncRoute(async (req, res) => {
  res.success(await service.listAlerts(req.query));
});
