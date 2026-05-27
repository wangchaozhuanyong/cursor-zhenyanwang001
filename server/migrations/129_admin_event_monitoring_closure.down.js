async function columnExists(query, table, column) {
  const [rows] = await query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function dropColumn(query, table, column) {
  if (!(await columnExists(query, table, column))) return;
  await query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
}

module.exports = {
  async down(query) {
    await query('DROP INDEX idx_admin_event_assignee_due ON admin_event_records').catch(() => {});
    await query('DROP INDEX idx_dca_assignee_status ON data_consistency_anomalies').catch(() => {});
    await query('DROP INDEX idx_drt_approval_status ON data_repair_tasks').catch(() => {});

    for (const column of ['assignee_id', 'due_at', 'priority', 'closed_reason']) {
      await dropColumn(query, 'admin_event_records', column);
    }
    await dropColumn(query, 'data_consistency_anomalies', 'assignee_id');
    for (const column of [
      'approval_status',
      'approved_by',
      'approved_at',
      'approval_source',
      'approval_remark',
      'execution_log',
      'rollback_suggestion',
    ]) {
      await dropColumn(query, 'data_repair_tasks', column);
    }
  },
};
