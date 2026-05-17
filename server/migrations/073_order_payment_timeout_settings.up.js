/** 未支付订单超时关单：站点设置默认值 */
module.exports = {
  async up(query) {
    await query(
      `INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES
        ('orderPaymentTimeoutEnabled', '0'),
        ('orderPaymentTimeoutMinutes', '30')`,
    );
  },
};
