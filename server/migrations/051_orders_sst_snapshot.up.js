/**
 * 订单 SST 快照（含税价拆分；与站点设置 sstEnabled / sstRatePercent 一致）。
 * 历史订单字段为空，仅新单写入。
 */
module.exports = {
  async up(query) {
    const addCol = async (sql) => {
      try {
        await query(sql);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    };
    await addCol(`
      ALTER TABLE orders
        ADD COLUMN tax_mode VARCHAR(20) NULL COMMENT 'inclusive 或空' AFTER total_amount
    `);
    await addCol(`
      ALTER TABLE orders
        ADD COLUMN tax_rate DECIMAL(8,3) NULL COMMENT '下单时税率%' AFTER tax_mode
    `);
    await addCol(`
      ALTER TABLE orders
        ADD COLUMN tax_label VARCHAR(64) NULL COMMENT '税种展示名' AFTER tax_rate
    `);
    await addCol(`
      ALTER TABLE orders
        ADD COLUMN taxable_amount DECIMAL(12,2) NULL COMMENT '含税应税商品金额' AFTER tax_label
    `);
    await addCol(`
      ALTER TABLE orders
        ADD COLUMN tax_amount DECIMAL(12,2) NULL COMMENT 'SST 税额' AFTER taxable_amount
    `);
    await addCol(`
      ALTER TABLE orders
        ADD COLUMN tax_exclusive_amount DECIMAL(12,2) NULL COMMENT '不含税商品净额' AFTER tax_amount
    `);
  },
};
