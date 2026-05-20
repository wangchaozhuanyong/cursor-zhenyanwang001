const fs = require('fs');
const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminExport.service');

exports.create = asyncRoute(async (req, res) => {
  const { type, params } = req.body;
  const r = await svc.createExportTask(type, params, req.user?.id);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data, r.message);
});

exports.list = asyncRoute(async (req, res) => {
  res.success(await svc.listExportTasks(req.user));
});

exports.download = asyncRoute(async (req, res) => {
  const r = await svc.downloadExportFile(req.params.id, req.user);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(r.fileName)}"`,
  );
  fs.createReadStream(r.filePath).pipe(res);
});

