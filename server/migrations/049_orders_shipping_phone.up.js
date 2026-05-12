/**
 * 为订单补充「收货联系电话 shipping_phone」字段。
 * 兼容旧数据：默认回填为 contact_phone（原联系人电话）。
 */
module.exports = {
  async up(query) {
    await query(
      `ALTER TABLE orders
         ADD COLUMN shipping_phone VARCHAR(32) NOT NULL DEFAULT '' COMMENT '收货联系电话（用于后台履约/客服）'
         AFTER contact_phone`,
    ).catch(() => {});

    await query(
      `UPDATE orders
         SET shipping_phone = contact_phone
       WHERE (shipping_phone IS NULL OR shipping_phone = '')
         AND contact_phone IS NOT NULL
         AND contact_phone != ''`,
    ).catch(() => {});
  },
};

