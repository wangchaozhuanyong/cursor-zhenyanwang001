/**
 * 用户通知已读状态（与 notification.repository 一致）
 *  - notifications.is_read TINYINT(1) NOT NULL DEFAULT 0
 */
module.exports = {
  async up(query) {
    await query(
      `ALTER TABLE notifications
       ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0`,
    ).catch(() => {});
    await query(
      'CREATE INDEX idx_notif_user_read ON notifications (user_id, is_read)',
    ).catch(() => {});
  },
};
