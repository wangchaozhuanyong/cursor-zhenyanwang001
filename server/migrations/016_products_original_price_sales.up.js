/**
 * 商品扩展字段：划线价 + 销量计数
 *  - original_price  原价（用于商品卡 / 详情页展示折扣，划线展示）
 *  - sales_count     已售数量（订单支付完成时累加，用于商品卡热度展示）
 *
 * 两字段均允许 NULL / 0，前端按业务规则决定是否渲染。
 */
module.exports = {
  async up(query) {
    await query(
      `ALTER TABLE products
       ADD COLUMN original_price DECIMAL(10,2) NULL DEFAULT NULL`,
    ).catch(() => {});
    await query(
      `ALTER TABLE products
       ADD COLUMN sales_count INT UNSIGNED NOT NULL DEFAULT 0`,
    ).catch(() => {});
    await query(
      'CREATE INDEX idx_products_sales_count ON products (sales_count)',
    ).catch(() => {});
  },
};
