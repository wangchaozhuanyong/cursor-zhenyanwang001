module.exports = {
  async up(query) {
    await query(`DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code IN ('notification.view','notification.create','notification.send','notification.revoke','notification.template','notification.trigger'))`);
    await query(`DELETE FROM permissions WHERE code IN ('notification.view','notification.create','notification.send','notification.revoke','notification.template','notification.trigger')`);
    await query('DROP TABLE IF EXISTS notification_batches');
  },
};
