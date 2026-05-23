const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

function loadWithMocks() {
  const servicePath = require.resolve('../src/modules/admin/service/adminOrderEvent.service');
  const repoPath = require.resolve('../src/modules/admin/repository/adminOrderEvent.repository');
  delete require.cache[servicePath];

  const calls = [];
  const repo = {
    async selectCreatedOrderEvents(since) {
      calls.push({ type: 'created', since });
      return [];
    },
    async selectPaidOrderEvents(since) {
      calls.push({ type: 'paid', since });
      return [];
    },
  };

  require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repo };
  const service = require(servicePath);
  return { service, calls };
}

describe('admin order event service', () => {
  beforeEach(() => {
    for (const key of Object.keys(require.cache)) {
      if (key.includes('adminOrderEvent.service') || key.includes('adminOrderEvent.repository')) {
        delete require.cache[key];
      }
    }
  });

  test('returns a server-side checkedAt cursor', async () => {
    const { service } = loadWithMocks();
    const result = await service.listRecentOrderEvents({});

    assert.deepEqual(result.events, []);
    assert.ok(result.checkedAt);
    assert.ok(!Number.isNaN(new Date(result.checkedAt).getTime()));
  });

  test('clamps a future since cursor to server time', async () => {
    const { service, calls } = loadWithMocks();
    const before = Date.now();
    await service.listRecentOrderEvents({ since: new Date(before + 60 * 60 * 1000).toISOString() });
    const after = Date.now();

    assert.equal(calls.length, 2);
    for (const call of calls) {
      assert.ok(call.since instanceof Date);
      assert.ok(call.since.getTime() >= before);
      assert.ok(call.since.getTime() <= after);
    }
  });
});
