const dataRetentionApi = /** @type {any} */ (require('../../dataRetention/publicApi'));

function getDataRetentionApi() {
  return dataRetentionApi || {};
}

function requireDataRetentionApi(name) {
  const fn = getDataRetentionApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`DataRetention module API missing method: ${name}`);
  }
  return fn;
}

function ensureExportDir() {
  return requireDataRetentionApi('ensureExportDir')();
}

function getExportDir() {
  return requireDataRetentionApi('getExportDir')();
}

function deleteExpiredExportFiles(retentionDays, batchSize, shouldCancel) {
  return requireDataRetentionApi('deleteExpiredExportFiles')(retentionDays, batchSize, shouldCancel);
}

module.exports = {
  ensureExportDir,
  getExportDir,
  deleteExpiredExportFiles,
};
