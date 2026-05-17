/** 首页模块开关默认配置（JSON 存 site_settings） */
const DEFAULT_JSON = JSON.stringify({
  modules: {
    banner: true,
    trust_bar: true,
    nav_grid: true,
    member_coupons: true,
    new_arrivals: true,
    hot_sales: true,
    recommend: true,
    guest_recommend: true,
  },
  hotBatchSize: 4,
  recBatchSize: 4,
  guestRecommendMax: 8,
});

module.exports = {
  async up(query) {
    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('home_module_settings', ?)
       ON DUPLICATE KEY UPDATE setting_value = setting_value`,
      [DEFAULT_JSON],
    );
  },
};
