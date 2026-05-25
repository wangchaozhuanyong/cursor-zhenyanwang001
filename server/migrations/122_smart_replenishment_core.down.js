module.exports = {
  async down(query) {
    await query(`ALTER TABLE inventory_conversion_orders DROP COLUMN cost_allocation_method`).catch(() => {});
    await query(`ALTER TABLE inventory_conversion_orders DROP COLUMN child_cost_after`).catch(() => {});
    await query(`ALTER TABLE inventory_conversion_orders DROP COLUMN child_cost_before`).catch(() => {});
    await query(`ALTER TABLE inventory_conversion_orders DROP COLUMN parent_cost_after`).catch(() => {});
    await query(`ALTER TABLE inventory_conversion_orders DROP COLUMN parent_cost_before`).catch(() => {});
    await query(`DROP TABLE IF EXISTS inventory_daily_snapshots`).catch(() => {});
    await query(`DROP TABLE IF EXISTS inventory_replenishment_run_items`).catch(() => {});
    await query(`DROP TABLE IF EXISTS inventory_replenishment_runs`).catch(() => {});
    await query(`DROP TABLE IF EXISTS inventory_replenishment_profiles`).catch(() => {});
    await query(`DROP INDEX idx_replenishment_suggestion_type ON inventory_replenishment_alerts`).catch(() => {});
    await query(`ALTER TABLE inventory_replenishment_alerts DROP COLUMN strategy_snapshot`).catch(() => {});
    await query(`ALTER TABLE inventory_replenishment_alerts DROP COLUMN suggestion_type`).catch(() => {});
    await query(`ALTER TABLE inventory_replenishment_alerts DROP COLUMN confidence_score`).catch(() => {});
    await query(`ALTER TABLE inventory_replenishment_alerts DROP COLUMN estimated_days_left`).catch(() => {});
    await query(`ALTER TABLE inventory_replenishment_alerts DROP COLUMN saleable_days`).catch(() => {});
    await query(`ALTER TABLE inventory_replenishment_alerts DROP COLUMN avg_daily_sales`).catch(() => {});
    await query(`ALTER TABLE inventory_replenishment_alerts DROP COLUMN upper_limit`).catch(() => {});
    await query(`ALTER TABLE inventory_replenishment_alerts DROP COLUMN lower_limit`).catch(() => {});
  },
};
