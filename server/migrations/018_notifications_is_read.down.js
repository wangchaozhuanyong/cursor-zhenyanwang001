module.exports = {
  async down(query) {
    await query('DROP INDEX idx_notif_user_read ON notifications').catch(() => {});
    await query('ALTER TABLE notifications DROP COLUMN is_read').catch(() => {});
  },
};
