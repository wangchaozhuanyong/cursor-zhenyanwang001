const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const healthService = require('../src/modules/health/service/health.service');

describe('health probe payload', () => {
  test('liveness omits instance details by default', () => {
    const prev = process.env.HEALTH_PROBE_VERBOSE;
    delete process.env.HEALTH_PROBE_VERBOSE;
    try {
      const payload = healthService.getLivenessPayload();
      assert.equal(payload.status, 'live');
      assert.ok('uptime' in payload);
      assert.equal(payload.instance, undefined);
      assert.equal(payload.node, undefined);
    } finally {
      if (prev === undefined) delete process.env.HEALTH_PROBE_VERBOSE;
      else process.env.HEALTH_PROBE_VERBOSE = prev;
    }
  });
});
