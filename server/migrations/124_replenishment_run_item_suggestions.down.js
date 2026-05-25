module.exports = {
  async down(query) {
    await query(`DROP INDEX idx_replenishment_run_items_suggestion_type ON inventory_replenishment_run_items`).catch(() => {});
    await query(`ALTER TABLE inventory_replenishment_run_items DROP COLUMN suggestion_payload`).catch(() => {});
    await query(`ALTER TABLE inventory_replenishment_run_items DROP COLUMN suggestion_type`).catch(() => {});
  },
};
