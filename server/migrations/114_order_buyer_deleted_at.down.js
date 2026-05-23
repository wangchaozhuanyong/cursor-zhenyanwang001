/** 删除用户侧隐藏字段会恢复所有已隐藏订单；down 仅用于本地回滚。 */
module.exports = {
  async down(query) {
    await query('DROP INDEX idx_orders_buyer_visible ON orders').catch(() => {});
    await query('ALTER TABLE orders DROP COLUMN buyer_deleted_at').catch(() => {});
  },
};
