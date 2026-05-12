const db = require('../../config/db');
const { generateId } = require('../../utils/helpers');

/**
 * @typedef {import('mysql2/promise').PoolConnection} PoolConnection
 */

/**
 * 企业级用户画像/消费统计服务（增量维护 user_statistics）
 *
 * 设计要点：
 * - 不在 users 主表堆统计列，使用独立 user_statistics（1:1）
 * - 使用事务 + 原子更新：`SET x = x + ?` 避免并发覆盖
 * - 支持传入已有事务连接（conn）以保证与订单状态变更原子一致
 */
class UserStatsService {
  /**
   * 确保 user_statistics 行存在（幂等）。
   * @param {PoolConnection} q
   * @param {string} userId
   */
  static async ensureRow(q, userId) {
    await q.query(
      `INSERT IGNORE INTO user_statistics (user_id) VALUES (?)`,
      [userId],
    );
  }

  /**
   * 记录统计事件（幂等）。只有插入成功才返回 true。
   * @param {PoolConnection} q
   * @param {{ userId: string; orderId: string; eventType: 'paid'|'cancelled'|'refunded' }} params
   * @returns {Promise<boolean>}
   */
  static async markEventOnce(q, params) {
    const { userId, orderId, eventType } = params;
    if (!userId || !orderId || !eventType) return false;
    const [r] = await q.query(
      `INSERT IGNORE INTO user_statistics_events (id, user_id, order_id, event_type)
       VALUES (?, ?, ?, ?)`,
      [generateId(), userId, orderId, eventType],
    );
    return Number(r?.affectedRows || 0) > 0;
  }

  /**
   * 订单支付成功后同步统计（RFM：total_spent/valid_order_count/AOV + 首末购时间）
   *
   * @param {string} userId
   * @param {number} orderAmount - 实付金额（RM），应为非负数
   * @param {string=} orderId - 订单ID（用于幂等去重，强烈建议传入）
   * @param {PoolConnection=} conn - 可选：已有事务连接
   */
  static async syncStatsAfterOrderPaid(userId, orderAmount, orderId, conn) {
    const amount = Number(orderAmount);
    if (!userId) return;
    if (!Number.isFinite(amount) || amount < 0) return;

    const q = conn || await db.getConnection();
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

      // 使用“旧值 + 本次增量”的表达式计算 AOV，避免需要先 SELECT 再 UPDATE
      await q.query(
        `UPDATE user_statistics
           SET total_spent = total_spent + ?,
               valid_order_count = valid_order_count + 1,
               average_order_value = ROUND((total_spent + ?) / (valid_order_count + 1), 2),
               first_purchase_at = COALESCE(first_purchase_at, NOW()),
               last_purchase_at = NOW()
         WHERE user_id = ?`,
        [amount, amount, userId],
      );

      // 退款率依赖 valid_order_count：支付后可顺带刷新一次（仍为 O(1)）
      await q.query(
        `UPDATE user_statistics
           SET refund_rate = IF(valid_order_count <= 0, 0, ROUND(refund_count / valid_order_count, 4))
         WHERE user_id = ?`,
        [userId],
      );

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
   * 售后退款成功后同步统计（refund_count + refund_rate）
   *
   * @param {string} userId
   * @param {string=} orderId - 订单ID（用于幂等去重，强烈建议传入）
   * @param {PoolConnection=} conn - 可选：已有事务连接
   */
  static async syncStatsAfterRefund(userId, orderId, conn) {
    if (!userId) return;
    const q = conn || await db.getConnection();
    const ownTx = !conn;
    try {
      if (ownTx) await q.beginTransaction();
      await UserStatsService.ensureRow(q, userId);
      if (orderId) {
        const ok = await UserStatsService.markEventOnce(q, { userId, orderId, eventType: 'refunded' });
        if (!ok) {
          if (ownTx) await q.commit();
          return;
        }
      }

      await q.query(
        `UPDATE user_statistics
           SET refund_count = refund_count + 1,
               refund_rate = IF(valid_order_count <= 0, 0, ROUND((refund_count + 1) / valid_order_count, 4))
         WHERE user_id = ?`,
        [userId],
      );

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
   * 订单取消后同步统计（cancelled_order_count +1）。
   * 注意：调用方应保证只在状态首次进入 CANCELLED 时触发（避免重复累计）。
   *
   * @param {string} userId
   * @param {string=} orderId - 订单ID（用于幂等去重，强烈建议传入）
   * @param {PoolConnection=} conn - 可选：已有事务连接
   */
  static async syncStatsAfterOrderCancelled(userId, orderId, conn) {
    if (!userId) return;
    const q = conn || await db.getConnection();
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
      await q.query(
        `UPDATE user_statistics
           SET cancelled_order_count = cancelled_order_count + 1
         WHERE user_id = ?`,
        [userId],
      );
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

