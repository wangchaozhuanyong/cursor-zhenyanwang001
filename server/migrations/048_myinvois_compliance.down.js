module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS myinvois_reconciliations');
    await query('DROP TABLE IF EXISTS myinvois_events');
    await query('DROP TABLE IF EXISTS myinvois_documents');
    await query('DROP TABLE IF EXISTS myinvois_profiles');
    await query(
      `DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'myinvois.manage')`,
    ).catch(() => {});
    await query(`DELETE FROM permissions WHERE code = 'myinvois.manage'`).catch(() => {});
  },
};
