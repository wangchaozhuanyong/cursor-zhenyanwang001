const test = require('node:test');
const assert = require('node:assert/strict');
const { klDateString } = require('../src/utils/klDateRange');

const pointsServicePath = require.resolve('../src/modules/user/service/points.service');
const pointsRepoPath = require.resolve('../src/modules/user/repository/points.repository');
const marketingPublicApiPath = require.resolve('../src/modules/marketing/publicApi');
const helpersPath = require.resolve('../src/utils/helpers');

function clearSignInServiceCache() {
  for (const path of [pointsServicePath, pointsRepoPath, marketingPublicApiPath, helpersPath]) {
    delete require.cache[path];
  }
}

test('klDateString uses KL calendar day not UTC date near midnight', () => {
  const utcLateEvening = new Date('2024-06-01T16:30:00.000Z');
  assert.equal(utcLateEvening.toISOString().slice(0, 10), '2024-06-01');
  assert.equal(klDateString(utcLateEvening), '2024-06-02');
});

test('klDateString matches UTC date during KL midday', () => {
  const utcMorning = new Date('2024-06-01T04:00:00.000Z');
  assert.equal(klDateString(utcMorning), '2024-06-01');
});

test('signIn uses active checkin reward activity and writes activity metadata', async () => {
  clearSignInServiceCache();
  let insertedRecord = null;
  let balanceUpdate = null;
  const conn = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
  };
  require.cache[pointsRepoPath] = {
    id: pointsRepoPath,
    filename: pointsRepoPath,
    loaded: true,
    exports: {
      async getConnection() {
        return conn;
      },
      async findSignInToday() {
        return null;
      },
      async countSignInActivityUsage() {
        return { total_count: 0, user_count: 0 };
      },
      async selectSignInRule() {
        throw new Error('activity should override legacy sign-in rule');
      },
      async selectRecordByRelatedForUpdate() {
        return null;
      },
      async selectAccountForUpdate() {
        return { balance: 10 };
      },
      async selectPendingReverseRecordsForUpdate() {
        return [];
      },
      async updateAccountBalance(_conn, userId, amount, balanceAfter) {
        balanceUpdate = { userId, amount, balanceAfter };
      },
      async insertLedgerRecord(_conn, params) {
        insertedRecord = params;
      },
    },
  };
  require.cache[marketingPublicApiPath] = {
    id: marketingPublicApiPath,
    filename: marketingPublicApiPath,
    loaded: true,
    exports: {
      async resolveCheckinReward() {
        return {
          activity_id: 'checkin-1',
          title: '六月签到',
          reward_points: 8,
          usage_limit_total: 0,
          usage_limit_per_user: 0,
          version: 2,
        };
      },
    },
  };
  require.cache[helpersPath] = {
    id: helpersPath,
    filename: helpersPath,
    loaded: true,
    exports: {
      generateId() {
        return 'points-record-1';
      },
    },
  };

  try {
    const service = require(pointsServicePath);
    const result = await service.signIn('user-1');

    assert.equal(result.data.points, 8);
    assert.equal(result.data.activity_id, 'checkin-1');
    assert.deepEqual(balanceUpdate, { userId: 'user-1', amount: 8, balanceAfter: 18 });
    assert.equal(insertedRecord.description, '签到奖励：六月签到');
    assert.equal(insertedRecord.metadata.activity_id, 'checkin-1');
    assert.equal(insertedRecord.metadata.version, 2);
  } finally {
    clearSignInServiceCache();
  }
});
