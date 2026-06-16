const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const paymentTimeout = require('../src/modules/order/service/orderPaymentTimeout.service');
const orderRepo = require('../src/modules/order/repository/order.repository');
const siteSettingsRepo = require('../src/modules/order/repository/siteSettings.repository');
const orderApi = require('../src/modules/order/publicApi');
const userApi = require('../src/modules/user/publicApi');

function mockConnection(calls) {
  return {
    async beginTransaction() {
      calls.begin += 1;
    },
    async commit() {
      calls.commit += 1;
    },
    async rollback() {
      calls.rollback += 1;
    },
    release() {
      calls.release += 1;
    },
  };
}

describe('orderPaymentTimeout', () => {
  test('loadPaymentTimeoutSettings defaults unpaid order timeout to enabled', async () => {
    const original = {
      selectSiteSettingsByKeys: siteSettingsRepo.selectSiteSettingsByKeys,
      enabled: process.env.ORDER_PAYMENT_TIMEOUT_ENABLED,
      minutes: process.env.ORDER_PAYMENT_TIMEOUT_MINUTES,
    };
    try {
      delete process.env.ORDER_PAYMENT_TIMEOUT_ENABLED;
      delete process.env.ORDER_PAYMENT_TIMEOUT_MINUTES;
      siteSettingsRepo.selectSiteSettingsByKeys = async (keys) => {
        assert.deepEqual(keys, ['orderPaymentTimeoutEnabled', 'orderPaymentTimeoutMinutes']);
        return [];
      };

      const settings = await paymentTimeout.loadPaymentTimeoutSettings();

      assert.equal(settings.enabled, true);
      assert.equal(settings.minutes, 30);
    } finally {
      siteSettingsRepo.selectSiteSettingsByKeys = original.selectSiteSettingsByKeys;
      if (original.enabled === undefined) delete process.env.ORDER_PAYMENT_TIMEOUT_ENABLED;
      else process.env.ORDER_PAYMENT_TIMEOUT_ENABLED = original.enabled;
      if (original.minutes === undefined) delete process.env.ORDER_PAYMENT_TIMEOUT_MINUTES;
      else process.env.ORDER_PAYMENT_TIMEOUT_MINUTES = original.minutes;
    }
  });

  test('autoCancelOneOrder routes expired pending order through unified cancel flow', async () => {
    const original = {
      getConnection: orderRepo.getConnection,
      selectOrderByIdForUpdate: orderRepo.selectOrderByIdForUpdate,
      cancelPendingOrderInTransaction: orderApi.cancelPendingOrderInTransaction,
      syncStatsAfterOrderCancelled: userApi.syncStatsAfterOrderCancelled,
    };
    const calls = { begin: 0, commit: 0, rollback: 0, release: 0 };
    const conn = mockConnection(calls);
    let cancelArgs = null;
    let syncArgs = null;
    try {
      orderRepo.getConnection = async () => conn;
      orderRepo.selectOrderByIdForUpdate = async (_conn, orderId) => {
        assert.equal(_conn, conn);
        assert.equal(orderId, 'order-1');
        return {
          id: 'order-1',
          user_id: 'user-1',
          order_no: 'NO-001',
          status: 'pending',
          payment_status: 'pending',
          created_at: new Date(Date.now() - 61 * 60 * 1000).toISOString(),
        };
      };
      orderApi.cancelPendingOrderInTransaction = async (_conn, order, options) => {
        cancelArgs = { conn: _conn, order, options };
      };
      userApi.syncStatsAfterOrderCancelled = async (userId, orderId, _conn) => {
        syncArgs = { userId, orderId, conn: _conn };
      };

      const cancelled = await paymentTimeout.autoCancelOneOrder('order-1', 30);

      assert.equal(cancelled, true);
      assert.equal(cancelArgs?.conn, conn);
      assert.equal(cancelArgs?.order.id, 'order-1');
      assert.equal(cancelArgs?.options.trigger, 'auto_cancel_unpaid_order');
      assert.match(cancelArgs?.options.stockReason, /释放库存/);
      assert.match(cancelArgs?.options.pointReason, /积分回滚/);
      assert.deepEqual(syncArgs, { userId: 'user-1', orderId: 'order-1', conn });
      assert.deepEqual(calls, { begin: 1, commit: 1, rollback: 0, release: 1 });
    } finally {
      orderRepo.getConnection = original.getConnection;
      orderRepo.selectOrderByIdForUpdate = original.selectOrderByIdForUpdate;
      orderApi.cancelPendingOrderInTransaction = original.cancelPendingOrderInTransaction;
      userApi.syncStatsAfterOrderCancelled = original.syncStatsAfterOrderCancelled;
    }
  });

  test('autoCancelOneOrder ignores non-expired pending order without release side effects', async () => {
    const original = {
      getConnection: orderRepo.getConnection,
      selectOrderByIdForUpdate: orderRepo.selectOrderByIdForUpdate,
      cancelPendingOrderInTransaction: orderApi.cancelPendingOrderInTransaction,
      syncStatsAfterOrderCancelled: userApi.syncStatsAfterOrderCancelled,
    };
    const calls = { begin: 0, commit: 0, rollback: 0, release: 0 };
    try {
      orderRepo.getConnection = async () => mockConnection(calls);
      orderRepo.selectOrderByIdForUpdate = async () => ({
        id: 'order-2',
        user_id: 'user-2',
        order_no: 'NO-002',
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
      });
      orderApi.cancelPendingOrderInTransaction = async () => {
        throw new Error('non-expired order must not be cancelled');
      };
      userApi.syncStatsAfterOrderCancelled = async () => {
        throw new Error('non-expired order must not sync cancel stats');
      };

      const cancelled = await paymentTimeout.autoCancelOneOrder('order-2', 30);

      assert.equal(cancelled, false);
      assert.deepEqual(calls, { begin: 1, commit: 0, rollback: 1, release: 1 });
    } finally {
      orderRepo.getConnection = original.getConnection;
      orderRepo.selectOrderByIdForUpdate = original.selectOrderByIdForUpdate;
      orderApi.cancelPendingOrderInTransaction = original.cancelPendingOrderInTransaction;
      userApi.syncStatsAfterOrderCancelled = original.syncStatsAfterOrderCancelled;
    }
  });
});
