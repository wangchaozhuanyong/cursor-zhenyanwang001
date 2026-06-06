const fs = require('fs');
const path = require('path');
const { generateId } = require('../../../utils/helpers');
const repo = require('../repository/adminExport.repository');
const adminReportService = require('./adminReport.service');
const { EXPORT_TASK_STATUS } = require('../../../constants/status');
const { getReportDefinition, listExportableReports } = require('../report/adminReportRegistry');
const siteCapabilitiesService = require('./adminSiteCapabilities.service');
const {
  deleteExpiredExportFiles,
  ensureExportDir,
  getExportDir,
} = require('./adminExportCleanup.service');

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

function isSupportedExportType(type) {
  return listExportableReports().some((report) => report.type === type);
}

function safeExportFileName(name, fallback = 'export.csv') {
  const fallbackName = String(fallback || 'export.csv').split(/[\\/]/).pop() || 'export.csv';
  const raw = String(name || fallbackName).split(/[\\/]/).pop() || fallbackName;
  const cleaned = raw.replace(/[\x00-\x1F\x7F<>:"|?*]+/g, '_').trim().slice(0, 180);
  if (!cleaned || cleaned === '.' || cleaned === '..') return fallbackName;
  return cleaned;
}

function isPathInsideDir(filePath, dirPath) {
  const resolvedFile = path.resolve(String(filePath || ''));
  const resolvedDir = path.resolve(dirPath);
  const relative = path.relative(resolvedDir, resolvedFile);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolveExportFilePath(fileName) {
  const exportDir = getExportDir();
  const filePath = path.resolve(exportDir, safeExportFileName(fileName));
  if (!isPathInsideDir(filePath, exportDir)) {
    throw new Error('Export file path escaped export directory');
  }
  return filePath;
}

function normalizeStoredExportFilePath(filePath) {
  if (!isPathInsideDir(filePath, getExportDir())) return '';
  return path.resolve(String(filePath || ''));
}

async function createExportTask(type, params, adminUserId) {
  const definition = getReportDefinition(type);
  if (!definition || !isSupportedExportType(type)) {
    return { error: { code: 400, message: `不支持的导出类型: ${type}` } };
  }
  if (definition.capability && !(await siteCapabilitiesService.isCapabilityEnabled(definition.capability))) {
    return { error: { code: 403, message: '该导出类型对应功能已关闭' } };
  }

  const id = generateId();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `${type}_${timestamp}.csv`;

  await repo.insertTask(id, fileName, type, adminUserId);

  setImmediate(async () => {
    try {
      ensureExportDir();
      const { csv, filename: suggestedName } = await adminReportService.exportByType(type, params || {});
      const finalName = safeExportFileName(suggestedName, fileName);
      const filePath = resolveExportFilePath(`${id}_${finalName}`);
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
  const safePath = normalizeStoredExportFilePath(task.file_path);
  if (!safePath) {
    return { error: { code: 403, message: '导出文件路径异常' } };
  }
  if (!fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
    return { error: { code: 404, message: '文件不存在' } };
  }
  return { filePath: safePath, fileName: safeExportFileName(task.file_name) };
}

module.exports = {
  createExportTask,
  listExportTasks,
  downloadExportFile,
  startCleanupScheduler,
  _private: {
    safeExportFileName,
    isPathInsideDir,
    resolveExportFilePath,
    normalizeStoredExportFilePath,
  },
};

