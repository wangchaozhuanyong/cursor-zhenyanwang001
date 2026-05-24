const test = require('node:test');
const assert = require('node:assert/strict');
const userModule = require('../src/modules/user');
const pointsRepo = require('../src/modules/user/repository/points.repository');
const pointsService = require('../src/modules/user/service/points.service');
const orderPoints = require('../src/modules/order/service/orderPoints.service');

const originalUserApi = { ...userModule.api };
const originalRepo = {
  selectRecordByRelatedForUpdate: pointsRepo.selectRecordByRelatedForUpdate,
  selectAccountForUpdate: pointsRepo.selectAccountForUpdate,
  selectPendingReverseRecordsForUpdate: pointsRepo.selectPendingReverseRecordsForUpdate,
  updatePendingReverseRecord: pointsRepo.updatePendingReverseRecord,
  updateAccountBalance: pointsRepo.updateAccountBalance,
  insertLedgerRecord: pointsRepo.insertLedgerRecord,
};

function restore() {
  Object.assign(userModule.api, originalUserApi);
  Object.assign(pointsRepo, originalRepo);
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

test('grantOrderEarnPoints always grants when order has earnable points', async () => {
  const calls = [];
  userModule.api.changeUserPoints = async (_conn, payload) => {
    calls.push(payload);
    return { skipped: false };
  };

  await orderPoints.grantOrderEarnPoints({}, baseOrder, { timing: 'payment_success', trigger: 'payment_success' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].action, 'order_earn');
  assert.equal(calls[0].amount, 50);
});

test('maybeGrantOrderEarnPoints skips points_gift orders', async () => {
  const result = await orderPoints.maybeGrantOrderEarnPoints({}, { id: 'g1', user_id: 'u1', total_points: 0, order_type: 'points_gift' }, {
    timing: 'order_completed',
  });
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'points_gift_order_no_earn');
});

test('maybeGrantOrderEarnPoints respects configured settle_timing', async () => {
  const calls = [];
  userModule.api.changeUserPoints = async (_conn, payload) => {
    calls.push(payload);
    return { skipped: false };
  };

  const mismatch = await orderPoints.maybeGrantOrderEarnPoints({}, baseOrder, {
    timing: 'payment_success',
    pointsSettings: { settle_timing: 'order_completed' },
  });
  assert.equal(mismatch.skipped, true);
  assert.equal(mismatch.reason, 'settle_timing_mismatch');
  assert.equal(calls.length, 0);

  await orderPoints.maybeGrantOrderEarnPoints({}, baseOrder, {
    timing: 'order_completed',
    pointsSettings: { settle_timing: 'order_completed' },
    trigger: 'admin_order_completed',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].relatedRecordId, 'order_earn:order-1');
});

test('cancel/refund redeem-only path refunds redeemed points without earned rollback', async () => {
  const calls = [];
  userModule.api.changeUserPoints = async (_conn, payload) => {
    calls.push(payload);
    return { skipped: false };
  };

  await orderPoints.refundOrderRedeemOnly({}, baseOrder, { trigger: 'cancel' });
  assert.deepEqual(calls.map((x) => x.action), ['order_redeem_reverse']);
  assert.deepEqual(calls.map((x) => x.relatedRecordId), ['order_redeem_reverse:order-1']);
});

test('earned rollback skips when order earn record does not exist', async () => {
  const calls = [];
  userModule.api.selectPointsRecordByRelatedForUpdate = async () => null;
  userModule.api.changeUserPoints = async (_conn, payload) => {
    calls.push(payload);
    return { skipped: false };
  };

  const result = await orderPoints.reverseOrderEarnOnly({}, baseOrder, { trigger: 'refund' });
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'order_points_not_granted');
  assert.equal(calls.length, 0);
});

test('completed order full refund rolls back granted earned points with fixed idempotency key', async () => {
  const calls = [];
  userModule.api.selectPointsRecordByRelatedForUpdate = async (_conn, related, action) => (
    related === 'order_earn:order-1' && action === 'order_earn' ? { id: 'earned' } : null
  );
  userModule.api.changeUserPoints = async (_conn, payload) => {
    calls.push(payload);
    return { skipped: false };
  };

  await orderPoints.reverseOrderEarnOnly({}, baseOrder, { trigger: 'full_refund' });
  assert.deepEqual(calls.map((x) => x.action), ['order_reverse']);
  assert.equal(calls[0].amount, -50);
  assert.equal(calls[0].relatedRecordId, 'order_reverse:order-1');
  assert.equal(calls[0].pendingOnInsufficient, true);
});

test('partial refund rolls back earned and redeemed points proportionally after completion', async () => {
  const calls = [];
  userModule.api.selectPointsRecordByRelatedForUpdate = async (_conn, related, action) => (
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

test('partial refund before completion skips earned rollback and only refunds redeemed points', async () => {
  const calls = [];
  userModule.api.selectPointsRecordByRelatedForUpdate = async () => null;
  userModule.api.changeUserPoints = async (_conn, payload) => {
    calls.push(payload);
    return { skipped: false };
  };

  await orderPoints.rollbackOrderPointsForPartialRefund({}, baseOrder, 40, { refundId: 'refund-1' });
  assert.deepEqual(calls.map((x) => x.action), ['order_redeem_reverse']);
});

test('positive points first offset pending_reverse before entering balance', async () => {
  const accountUpdates = [];
  const pendingUpdates = [];
  const ledger = [];
  pointsRepo.selectRecordByRelatedForUpdate = async () => null;
  pointsRepo.selectAccountForUpdate = async () => ({ user_id: 'user-1', balance: 5 });
  pointsRepo.selectPendingReverseRecordsForUpdate = async () => ([
    { id: 'pending-1', amount: -30, related_record_id: 'pending_reverse:order_reverse:order-1', metadata: '{"reason":"refund"}' },
  ]);
  pointsRepo.updatePendingReverseRecord = async (_conn, id, payload) => pendingUpdates.push({ id, ...payload });
  pointsRepo.updateAccountBalance = async (_conn, userId, amount, balanceAfter) => accountUpdates.push({ userId, amount, balanceAfter });
  pointsRepo.insertLedgerRecord = async (_conn, payload) => ledger.push(payload);

  const result = await pointsService.changeUserPoints({}, {
    userId: 'user-1',
    amount: 50,
    action: 'order_earn',
    description: 'completed order earn',
    sourceType: 'order_completion',
    relatedRecordId: 'order_earn:order-2',
  });

  assert.equal(result.pendingReverseOffset, 30);
  assert.equal(result.amount, 20);
  assert.deepEqual(accountUpdates, [{ userId: 'user-1', amount: 20, balanceAfter: 25 }]);
  assert.equal(pendingUpdates[0].amount, 0);
  assert.equal(pendingUpdates[0].status, 'resolved');
  assert.equal(ledger[0].amount, 20);
  assert.equal(ledger[0].balanceBefore, 5);
  assert.equal(ledger[0].balanceAfter, 25);
});

test('insufficient earned rollback creates pending_reverse instead of negative balance', async () => {
  const ledger = [];
  pointsRepo.selectRecordByRelatedForUpdate = async () => null;
  pointsRepo.selectAccountForUpdate = async () => ({ user_id: 'user-1', balance: 10 });
  pointsRepo.insertLedgerRecord = async (_conn, payload) => ledger.push(payload);

  const result = await pointsService.changeUserPoints({}, {
    userId: 'user-1',
    amount: -50,
    action: 'order_reverse',
    description: 'refund reverse earn',
    sourceType: 'order_refund',
    relatedRecordId: 'order_reverse:order-1',
    pendingOnInsufficient: true,
  });

  assert.equal(result.pending, true);
  assert.equal(ledger[0].action, 'pending_reverse');
  assert.equal(ledger[0].amount, -50);
  assert.equal(ledger[0].balanceBefore, 10);
  assert.equal(ledger[0].balanceAfter, 10);
});
