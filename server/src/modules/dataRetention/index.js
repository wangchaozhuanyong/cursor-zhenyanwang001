const { Router } = require('express');
const routes = require('./routes/dataRetention.routes');
const exportCleanup = require('./service/exportCleanup.service');

const router = Router();
router.use('/admin/data-retention', routes);

/** @type {any} */ (router).api = {
  ensureExportDir: exportCleanup.ensureExportDir,
  getExportDir: exportCleanup.getExportDir,
  listExpiredExportFiles: exportCleanup.listExpiredExportFiles,
  deleteExpiredExportFiles: exportCleanup.deleteExpiredExportFiles,
};

module.exports = router;
