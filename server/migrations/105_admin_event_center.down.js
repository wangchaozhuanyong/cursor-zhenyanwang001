module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS admin_event_actions').catch(() => {});
    await query('DROP TABLE IF EXISTS admin_event_user_states').catch(() => {});
    await query('DROP TABLE IF EXISTS admin_event_records').catch(() => {});
    await query('DROP TABLE IF EXISTS admin_event_rules').catch(() => {});
    await query("DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code IN ('event.view', 'event.manage', 'event.rule.manage'))").catch(() => {});
    await query("DELETE FROM permissions WHERE code IN ('event.view', 'event.manage', 'event.rule.manage')").catch(() => {});
  },
};
