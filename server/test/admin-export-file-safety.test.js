const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const exportService = require('../src/modules/admin/service/adminExport.service');

const {
  safeExportFileName,
  isPathInsideDir,
  resolveExportFilePath,
  normalizeStoredExportFilePath,
} = exportService._private;

describe('admin export file safety', () => {
  test('export filenames cannot carry path traversal segments', () => {
    assert.equal(safeExportFileName('../private.csv', 'fallback.csv'), 'private.csv');
    assert.equal(safeExportFileName('..\\private.csv', 'fallback.csv'), 'private.csv');
    assert.equal(safeExportFileName('..', 'fallback.csv'), 'fallback.csv');
    assert.equal(/[\\/]/.test(safeExportFileName('../../nested/report.csv', 'fallback.csv')), false);
  });

  test('export file paths must stay inside the export directory', () => {
    const inside = resolveExportFilePath('task_report.csv');
    const exportDir = path.dirname(inside);
    const outside = path.resolve(exportDir, '..', 'secret.csv');

    assert.equal(isPathInsideDir(inside, exportDir), true);
    assert.equal(isPathInsideDir(outside, exportDir), false);
    assert.equal(normalizeStoredExportFilePath(inside), inside);
    assert.equal(normalizeStoredExportFilePath(outside), '');
  });
});
