const { test } = require('node:test');
const assert = require('node:assert/strict');

const couponRepo = require('../src/modules/user/repository/coupon.repository');

test('insertUserCouponWithMeta falls back to legacy insert when lifecycle columns are missing', async () => {
  const queries = [];
  const conn = {
    query: async (sql, params) => {
      queries.push(String(sql));
      if (String(sql).includes('coupon_snapshot')) {
        const err = new Error("Unknown column 'coupon_snapshot' in 'field list'");
        err.code = 'ER_BAD_FIELD_ERROR';
        throw err;
      }
      return [{ affectedRows: 1 }];
    },
  };

  await couponRepo.insertUserCouponWithMeta(conn, {
    id: 'uc-1',
    userId: 'user-1',
    couponId: 'coupon-1',
    snapshot: { title: '测试券' },
    status: 'available',
    validFrom: '2026-01-01 00:00:00',
    validUntil: '2026-12-31 23:59:59',
    issueChannel: 'self_claim',
  });

  assert.equal(queries.length, 2);
  assert.match(queries[0], /coupon_snapshot/);
  assert.match(queries[1], /INSERT INTO user_coupons \(id, user_id, coupon_id, claimed_at, status\)/);
});

test('incrementClaimedCountIfAvailable falls back when claimed_count column is missing', async () => {
  const conn = {
    query: async (sql) => {
      if (String(sql).includes('claimed_count')) {
        const err = new Error("Unknown column 'claimed_count' in 'field list'");
        err.code = 'ER_BAD_FIELD_ERROR';
        throw err;
      }
      if (String(sql).includes('SELECT id, total_quantity')) {
        return [[{ id: 'coupon-1', total_quantity: 0 }]];
      }
      return [[{ cnt: 0 }]];
    },
  };

  const claimed = await couponRepo.incrementClaimedCountIfAvailable(conn, 'coupon-1');
  assert.equal(claimed, 1);
});
