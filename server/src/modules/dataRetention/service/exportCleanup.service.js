const fs = require('fs');
const path = require('path');

const EXPORT_DIR = path.join(__dirname, '../../../exports');
const DAY_MS = 24 * 60 * 60 * 1000;

function getExportDir() {
  return EXPORT_DIR;
}

function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

function listExpiredExportFiles(retentionDays, now = Date.now()) {
  if (!fs.existsSync(EXPORT_DIR)) return [];
  const cutoffMs = now - Number(retentionDays || 0) * DAY_MS;
  const files = [];
  for (const file of fs.readdirSync(EXPORT_DIR)) {
    const filePath = path.join(EXPORT_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile() || stat.mtimeMs >= cutoffMs) continue;
      files.push({
        id: file,
        fileName: file,
        filePath,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        mtime: new Date(stat.mtimeMs),
      });
    } catch {
      // Inaccessible files are skipped; the run step will report what it can see.
    }
  }
  files.sort((a, b) => a.mtimeMs - b.mtimeMs || a.fileName.localeCompare(b.fileName));
  return files;
}

async function deleteExpiredExportFiles(retentionDays, batchSize, shouldCancel = async () => false) {
  const files = listExpiredExportFiles(retentionDays);
  let deleted = 0;
  let batchCount = 0;
  for (let i = 0; i < files.length; i += batchSize) {
    if (await shouldCancel()) break;
    const batch = files.slice(i, i + batchSize);
    batchCount += 1;
    for (const file of batch) {
      try {
        fs.unlinkSync(file.filePath);
        deleted += 1;
      } catch {
        // File may have been removed by another process; continue with the batch.
      }
    }
  }
  return { matched: files.length, deleted, batchCount };
}

module.exports = {
  ensureExportDir,
  getExportDir,
  listExpiredExportFiles,
  deleteExpiredExportFiles,
};
