module.exports = {
  async up(query) {
    await query(
      `DELETE FROM site_settings
       WHERE setting_key IN ('orderPaymentTimeoutEnabled', 'orderPaymentTimeoutMinutes')`,
    );
  },
};
