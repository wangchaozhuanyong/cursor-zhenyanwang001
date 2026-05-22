const test = require('node:test');
const assert = require('node:assert/strict');
const { computeExpiredAmount } = require('../src/modules/loyalty/service/pointsExpire.service');

test('computeExpiredAmount uses FIFO and only expires unconsumed credits past cutoff', () => {
  const now = new Date('2024-06-10T12:00:00.000Z');
  const records = [
    { amount: 100, status: 'success', created_at: '2024-01-01T00:00:00.000Z' },
    { amount: -60, status: 'success', created_at: '2024-02-01T00:00:00.000Z' },
    { amount: 50, status: 'success', created_at: '2024-06-09T00:00:00.000Z' },
  ];
  assert.equal(computeExpiredAmount(records, 30, now), 40);
});

test('computeExpiredAmount returns zero when expire days not configured', () => {
  const records = [{ amount: 100, status: 'success', created_at: '2024-01-01T00:00:00.000Z' }];
  assert.equal(computeExpiredAmount(records, 0), 0);
});
