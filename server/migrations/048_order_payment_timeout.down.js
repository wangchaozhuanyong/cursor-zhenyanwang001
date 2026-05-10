module.exports = {
  async down(query) {
    try {
      await query('DROP INDEX idx_order_items_activity ON order_items');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    }

    try {
      await query('DROP INDEX idx_orders_unpaid_timeout ON orders');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    }

    const alterStatements = [
      'ALTER TABLE order_items DROP COLUMN activity_title',
      'ALTER TABLE order_items DROP COLUMN activity_id',
      'ALTER TABLE orders DROP COLUMN cancel_reason',
      'ALTER TABLE orders DROP COLUMN cancelled_at',
    ];

    for (const sql of alterStatements) {
      try {
        await query(sql);
      } catch (e) {
        if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      }
    }
  },
};
