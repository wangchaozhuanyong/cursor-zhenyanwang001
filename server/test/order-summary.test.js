const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const repo = require('../src/modules/order/repository/order.repository');

describe('order summary', () => {
  test('uses order-center tab-compatible completed and pending-review counts', async () => {
    const calls = [];
    const fakeDb = {
      query: async (sql, params) => {
        calls.push({ sql, params });
        if (calls.length === 1) {
          return [[{
            total: 4,
            pending_payment: 1,
            paid: 1,
            pending_ship: 1,
            shipped: 1,
            pending_receive: 1,
            completed: 1,
            cancelled: 0,
          }]];
        }
        if (calls.length === 2) return [[{ after_sale: 1 }]];
        if (calls.length === 3) return [[{ pending_review: 1 }]];
        throw new Error(`unexpected query ${calls.length}`);
      },
    };

    const summary = await repo.selectOrderSummary(fakeDb, 'user-1');

    assert.equal(summary.completed, 1);
    assert.equal(summary.pending_review, 1);
    assert.match(calls[0].sql, /NOT EXISTS/);
    assert.match(calls[0].sql, /pr\.id IS NULL/);
    assert.match(calls[2].sql, /COUNT\(DISTINCT o\.id\) AS pending_review/);
  });
});
