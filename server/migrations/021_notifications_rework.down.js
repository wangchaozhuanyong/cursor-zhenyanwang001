module.exports = {
  async down(query) {
    await query('ALTER TABLE notifications DROP COLUMN link_url');
    await query('ALTER TABLE notifications DROP COLUMN template_code');
    await query('ALTER TABLE notifications DROP INDEX idx_notifications_workflow_status');
    await query('ALTER TABLE notifications DROP COLUMN workflow_status');
    await query('ALTER TABLE notifications DROP INDEX idx_notifications_deleted_at');
    await query('ALTER TABLE notifications DROP COLUMN deleted_at');
    await query('ALTER TABLE notifications DROP COLUMN sent_at');
    await query('ALTER TABLE notifications DROP COLUMN scheduled_at');
    await query('ALTER TABLE notifications DROP INDEX idx_notifications_send_status');
    await query('ALTER TABLE notifications DROP COLUMN send_status');
    await query('ALTER TABLE notifications DROP COLUMN audience_value');
    await query('ALTER TABLE notifications DROP COLUMN audience_type');
    await query('ALTER TABLE notifications DROP INDEX idx_notifications_batch');
    await query('ALTER TABLE notifications DROP COLUMN batch_id');
  },
};
