module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS payment_fees');
    await query('DROP TABLE IF EXISTS payment_events');
    await query('DROP TABLE IF EXISTS payment_reconciliations');
    await query('DROP TABLE IF EXISTS payment_orders');
    await query('DROP TABLE IF EXISTS payment_channels');
    await query(
      `DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'payment.manage')`,
    ).catch(() => {});
    await query(`DELETE FROM permissions WHERE code = 'payment.manage'`).catch(() => {});
  },
};
