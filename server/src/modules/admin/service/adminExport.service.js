const fs = require('fs');
const path = require('path');
const { generateId } = require('../../../utils/helpers');
const repo = require('../repository/adminExport.repository');
const adminReportService = require('./adminReport.service');
const adminProductService = require('./adminProduct.service');
const adminOrderService = require('./adminOrder.service');
const adminUserService = require('./adminUser.service');
const { EXPORT_TASK_STATUS } = require('../../../constants/status');
const {
  deleteExpiredExportFiles,
  ensureExportDir,
  getExportDir,
} = require('../../dataRetention/service/exportCleanup.service');

const CLEANUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;      // every 6 hours

async function cleanupExpiredFiles() {
  try {
    const fileResult = await deleteExpiredExportFiles(CLEANUP_MAX_AGE_MS / (24 * 60 * 60 * 1000), 1000);
    if (fileResult.deleted > 0) {
      console.log(`[export-cleanup] removed ${fileResult.deleted} expired files`);
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
  sales_daily: async (params) => adminReportService.exportByType("sales_daily", params),
  sales_monthly: async (params) => adminReportService.exportByType("sales_monthly", params),
  product_analysis: async (params) => adminReportService.exportByType("product_analysis", params),
  category_analysis: async (params) => adminReportService.exportByType("category_analysis", params),
  order_analysis: async (params) => adminReportService.exportByType("order_analysis", params),
  customer_analysis: async (params) => adminReportService.exportByType("customer_analysis", params),
  activity_analysis: async (params) => adminReportService.exportByType("activity_analysis", params),
  coupon_analysis: async (params) => adminReportService.exportByType("coupon_analysis", params),
  inventory_analysis: async (params) => adminReportService.exportByType("inventory_analysis", params),
  search_analysis: async (params) => adminReportService.exportByType("search_analysis", params),
  sales: async (params) => adminReportService.exportByType("sales_daily", params),
  users_report: async (params) => adminReportService.exportByType("customer_analysis", params),
  products_report: async (params) => adminReportService.exportByType("product_analysis", params),
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
      const filePath = path.join(getExportDir(), `${id}_${finalName}`);
      fs.writeFileSync(filePath, `\uFEFF${csv}`, 'utf8');
      const stat = fs.statSync(filePath);
      await repo.updateTaskSuccess(id, filePath, stat.size);
    } catch (err) {
      await repo.updateTaskFailure(id, err.message || String(err));
    }
  });

  return { data: { id, fileName, status: EXPORT_TASK_STATUS.PENDING }, message: '导出任务已创建' };
}

async function listExportTasks(requester = {}) {
  const createdBy = requester.isSuperAdmin ? undefined : requester.id;
  return repo.selectTasks(100, createdBy);
}

async function downloadExportFile(taskId, requester = {}) {
  const task = await repo.selectTaskById(taskId);
  if (!task) return { error: { code: 404, message: '任务不存在' } };
  const createdBy = task.created_by == null ? '' : String(task.created_by);
  const requesterId = requester.id == null ? '' : String(requester.id);
  if (!requester.isSuperAdmin && (!createdBy || createdBy !== requesterId)) {
    return { error: { code: 403, message: '无权下载该导出文件' } };
  }
  if (task.status !== EXPORT_TASK_STATUS.SUCCESS) return { error: { code: 400, message: '文件尚未就绪' } };
  if (!task.file_path || !fs.existsSync(task.file_path)) {
    return { error: { code: 404, message: '文件不存在' } };
  }
  return { filePath: task.file_path, fileName: task.file_name };
}

module.exports = { createExportTask, listExportTasks, downloadExportFile, startCleanupScheduler };








