const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('backup service exports', () => {
  test('exports restore lifecycle handlers', () => {
    const service = require('../src/modules/admin/service/backup.service');
    assert.equal(typeof service.getOverview, 'function');
    assert.equal(typeof service.createFullBackup, 'function');
    assert.equal(typeof service.createRestoreJob, 'function');
    assert.equal(typeof service.approveRestoreJob, 'function');
    assert.equal(typeof service.switchRestoreJobToProduction, 'function');
    assert.equal(typeof service.listRestoreJobs, 'function');
  });
});
