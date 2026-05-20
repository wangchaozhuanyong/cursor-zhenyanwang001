const test = require('node:test');
const assert = require('node:assert/strict');
const userModule = require('../src/modules/user');
const loyaltyRepo = require('../src/modules/loyalty/repository/loyalty.repository');
const pointsRepo = require('../src/modules/user/repository/points.repository');
const orderPoints = require('../src/modules/order/service/orderPoints.service');

const originalUserApi = { ...userModule.api };
const originalSelectPointsSettings = loyaltyRepo.selectPointsSettings;
const originalSelectRecordByRelatedForUpdate = pointsRepo.selectRecordByRelatedForUpdate;

function restore() {
  Object.assign(userModule.api, originalUserApi);
  loyaltyRepo.selectPointsSettings = originalSelectPointsSettings;
  pointsRepo.selectRecordByRelatedForUpdate = originalSelectRecordByRelatedForUpdate;
}

test.afterEach(restore);

const baseOrder = {
  id: 'order-1',
  user_id: 'user-1',
  order_no: 'NO-1',
  total_amount: 100,
  total_points: 50,
  points_used: 100,
};

test('grantOrderEarnPoints honors settle_timing and related idempotency key', async () => {
  const calls = [];
  loyaltyRepo.selectPointsSettings = async () => ({ settle_timing: 'payment_success' });
  userModule.api.changeUserPoints = async (_conn, payload) => {
    calls.push(payload);
    return { skipped: false };
  };

  const skipped = await orderPoints.grantOrderEarnPoints({}, baseOrder, { timing: 'order_completed' });
  assert.equal(skipped.skipped, true);
  assert.equal(calls.length, 0);

  await orderPoints.grantOrderEarnPoints({}, baseOrder, { timing: 'payment_success', trigger: 'payment_success' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].action, 'order_earn');
  assert.equal(calls[0].relatedRecordId, 'order_earn:order-1');
});

test('rollbackOrderPoints is idempotent through fixed related ids', async () => {
  const calls = [];
  pointsRepo.selectRecordByRelatedForUpdate = async (_conn, related, action) => (
    related === 'order_earn:order-1' && action === 'order_earn' ? { id: 'earned' } : null
  );
  userModule.api.changeUserPoints = async (_conn, payload) => {
    calls.push(payload);
    return { skipped: false };
  };

  await orderPoints.rollbackOrderPoints({}, baseOrder, { trigger: 'cancel' });
  assert.deepEqual(calls.map((x) => x.action), ['order_reverse', 'order_redeem_reverse']);
  assert.deepEqual(calls.map((x) => x.relatedRecordId), ['order_reverse:order-1', 'order_redeem_reverse:order-1']);
});

test('partial refund rolls back earned and redeemed points proportionally', async () => {
  const calls = [];
  pointsRepo.selectRecordByRelatedForUpdate = async (_conn, related, action) => (
    related === 'order_earn:order-1' && action === 'order_earn' ? { id: 'earned' } : null
  );
  userModule.api.changeUserPoints = async (_conn, payload) => {
    calls.push(payload);
    return { skipped: false };
  };

  await orderPoints.rollbackOrderPointsForPartialRefund({}, baseOrder, 40, {
    returnId: 'return-1',
    trigger: 'return_approved',
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].action, 'order_reverse');
  assert.equal(calls[0].amount, -20);
  assert.equal(calls[0].relatedRecordId, 'order_reverse_partial:return-1');
  assert.equal(calls[1].action, 'order_redeem_reverse');
  assert.equal(calls[1].amount, 40);
  assert.equal(calls[1].relatedRecordId, 'order_redeem_reverse_partial:return-1');
});

test('partial refund skips earned rollback when order points were never granted', async () => {
  const calls = [];
  pointsRepo.selectRecordByRelatedForUpdate = async () => null;
  userModule.api.changeUserPoints = async (_conn, payload) => {
    calls.push(payload);
    return { skipped: false };
  };

  await orderPoints.rollbackOrderPointsForPartialRefund({}, baseOrder, 40, { refundId: 'refund-1' });
  assert.deepEqual(calls.map((x) => x.action), ['order_redeem_reverse']);
});
