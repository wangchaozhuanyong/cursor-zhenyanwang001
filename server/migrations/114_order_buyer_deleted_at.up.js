/** 用户侧删除订单：只隐藏买家订单列表，后台、报表和售后记录继续保留。 */
module.exports = {
  async up(query) {
    await query(
      'ALTER TABLE orders ADD COLUMN buyer_deleted_at DATETIME DEFAULT NULL AFTER completed_at',
    ).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });
    await query('CREATE INDEX idx_orders_buyer_visible ON orders (user_id, buyer_deleted_at, created_at)').catch((e) => {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    });
  },
};
