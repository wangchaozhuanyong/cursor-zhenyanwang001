/**
 * 评论精选标记
 *  - product_reviews.is_featured  TINYINT(1) DEFAULT 0
 * 用于首页"用户口碑"板块的精选聚合接口。
 */
module.exports = {
  async up(query) {
    await query(
      `ALTER TABLE product_reviews
       ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0`,
    ).catch(() => {});
    await query(
      'CREATE INDEX idx_reviews_is_featured ON product_reviews (is_featured)',
    ).catch(() => {});
  },
};
