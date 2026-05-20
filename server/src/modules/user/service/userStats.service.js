const repo = require('../repository/userStats.repository');

/**
 * @typedef {import('mysql2/promise').PoolConnection} PoolConnection
 */

class UserStatsService {
  /**
   * @param {PoolConnection} q
   * @param {string} userId
   */
  static async ensureRow(q, userId) {
    await repo.ensureRow(q, userId);
  }

  /**
   * @param {PoolConnection} q
   * @param {{ userId: string; orderId: string; eventType: string }} params
   * @returns {Promise<boolean>}
   */
  static async markEventOnce(q, params) {
    const { userId, orderId, eventType } = params;
    if (!userId || !orderId || !eventType) return false;
    return repo.insertEventIfAbsent(q, { userId, orderId, eventType });
  }

  /**
   * @param {string} userId
   * @param {number} orderAmount
   * @param {string=} orderId
   * @param {PoolConnection=} conn
   */
  static async syncStatsAfterOrderPaid(userId, orderAmount, orderId, conn) {
    const amount = Number(orderAmount);
    if (!userId) return;
    if (!Number.isFinite(amount) || amount < 0) return;

    const q = conn || await repo.getConnection();
    const ownTx = !conn;
    try {
      if (ownTx) await q.beginTransaction();
      await UserStatsService.ensureRow(q, userId);
      if (orderId) {
        const ok = await UserStatsService.markEventOnce(q, { userId, orderId, eventType: 'paid' });
        if (!ok) {
          if (ownTx) await q.commit();
          return;
        }
      }

      await repo.incrementPaidStats(q, userId, amount);
      await repo.refreshRefundRate(q, userId);

      if (ownTx) await q.commit();
    } catch (e) {
      if (ownTx) {
        try { await q.rollback(); } catch { /* ignore */ }
      }
      throw e;
    } finally {
      if (ownTx) q.release();
    }
  }

  /**
   * @param {string} userId
   * @param {string} orderId
   * @param {number} refundAmount
   * @param {PoolConnection=} conn
   * @param {{ isFullRefund?: boolean; eventType?: string }} options
   */
  static async syncStatsAfterRefund(userId, orderId, refundAmount, conn, options = {}) {
    if (!userId) return;
    const amount = Math.max(0, Number(refundAmount) || 0);
    const eventType = options.eventType || (options.isFullRefund ? 'refunded' : `refund_partial:${orderId}:${amount}`);

    const q = conn || await repo.getConnection();
    const ownTx = !conn;
    try {
      if (ownTx) await q.beginTransaction();
      await UserStatsService.ensureRow(q, userId);

      let shouldApply = true;
      if (orderId && eventType) {
        shouldApply = await UserStatsService.markEventOnce(q, { userId, orderId, eventType });
      }
      if (shouldApply) {
        if (amount > 0) {
          await repo.decrementPaidStats(q, userId, amount);
        }
        if (options.isFullRefund) {
          await repo.incrementRefundStats(q, userId);
        }
      }

      if (ownTx) await q.commit();
    } catch (e) {
      if (ownTx) {
        try { await q.rollback(); } catch { /* ignore */ }
      }
      throw e;
    } finally {
      if (ownTx) q.release();
    }
  }

  /**
   * @param {string} userId
   * @param {string=} orderId
   * @param {PoolConnection=} conn
   */
  static async syncStatsAfterOrderCancelled(userId, orderId, conn) {
    if (!userId) return;
    const q = conn || await repo.getConnection();
    const ownTx = !conn;
    try {
      if (ownTx) await q.beginTransaction();
      await UserStatsService.ensureRow(q, userId);
      if (orderId) {
        const ok = await UserStatsService.markEventOnce(q, { userId, orderId, eventType: 'cancelled' });
        if (!ok) {
          if (ownTx) await q.commit();
          return;
        }
      }
      await repo.incrementCancelledOrderCount(q, userId);
      if (ownTx) await q.commit();
    } catch (e) {
      if (ownTx) {
        try { await q.rollback(); } catch { /* ignore */ }
      }
      throw e;
    } finally {
      if (ownTx) q.release();
    }
  }
}

module.exports = { UserStatsService };
