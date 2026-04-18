const path = require('path');
const fs = require('fs');
const { generateId } = require('../../utils/helpers');
const repo = require('./adminExport.repository');
const adminReportService = require('./adminReport.service');
const adminProductService = require('./adminProduct.service');
const adminOrderService = require('./adminOrder.service');
const adminUserService = require('./adminUser.service');
const { EXPORT_TASK_STATUS } = require('../../constants/status');

const EXPORT_DIR = path.join(__dirname, '../../../exports');
const CLEANUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;      // every 6 hours

function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

async function cleanupExpiredFiles() {
  try {
    if (fs.existsSync(EXPORT_DIR)) {
      const now = Date.now();
      const files = fs.readdirSync(EXPORT_DIR);
      for (const file of files) {
        const filePath = path.join(EXPORT_DIR, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile() && (now - stat.mtimeMs) > CLEANUP_MAX_AGE_MS) {
            fs.unlinkSync(filePath);
            console.log(`[export-cleanup] removed expired file: ${file}`);
          }
        } catch (_) { /* skip inaccessible files */ }
      }
    }
    const deleted = await repo.deleteExpiredTasks(30);
    if (deleted > 0) {
      console.log(`[export-cleanup] purged ${deleted} expired task records`);
    }
  } catch (err) {
    console.error('[export-cleanup] error:', err.message);
  }
}

let _cleanupTimer = null;
function startCleanupScheduler() {
  if (_cleanupTimer) return;
  cleanupExpiredFiles();
  _cleanupTimer = setInterval(cleanupExpiredFiles, CLEANUP_INTERVAL_MS);
  if (_cleanupTimer.unref) _cleanupTimer.unref();
}

const TYPE_GENERATORS = {
  sales: async (params) => adminReportService.exportSalesReportCsv(params),
  users_report: async (params) => adminReportService.exportUserReportCsv(params),
  products_report: async () => adminReportService.exportProductReportCsv(),
  products: async (params) => adminProductService.exportProductsCsv(params),
  orders: async (params) => adminOrderService.exportOrdersCsv(params),
  users: async (params) => adminUserService.exportUsersCsv(params),
};

async function createExportTask(type, params, adminUserId) {
  if (!TYPE_GENERATORS[type]) {
    return { error: { code: 400, message: `不支持的导出类型: ${type}` } };
  }

  const id = generateId();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `${type}_${timestamp}.csv`;

  await repo.insertTask(id, fileName, type, adminUserId);

  setImmediate(async () => {
    try {
      ensureExportDir();
      const generator = TYPE_GENERATORS[type];
      const { csv, filename: suggestedName } = await generator(params || {});
      const finalName = suggestedName || fileName;
      const filePath = path.join(EXPORT_DIR, `${id}_${finalName}`);
      fs.writeFileSync(filePath, `\uFEFF${csv}`, 'utf8');
      const stat = fs.statSync(filePath);
      await repo.updateTaskSuccess(id, filePath, stat.size);
    } catch (err) {
      await repo.updateTaskFailure(id, err.message || String(err));
    }
  });

  return { data: { id, fileName, status: EXPORT_TASK_STATUS.PENDING }, message: '导出任务已创建' };
}

async function listExportTasks() {
  return repo.selectTasks(100);
}

async function downloadExportFile(taskId) {
  const task = await repo.selectTaskById(taskId);
  if (!task) return { error: { code: 404, message: '任务不存在' } };
  if (task.status !== EXPORT_TASK_STATUS.SUCCESS) return { error: { code: 400, message: '文件未就绪' } };
  if (!task.file_path || !fs.existsSync(task.file_path)) {
    return { error: { code: 404, message: '文件不存在' } };
  }
  return { filePath: task.file_path, fileName: task.file_name };
}

module.exports = { createExportTask, listExportTasks, downloadExportFile, startCleanupScheduler };
