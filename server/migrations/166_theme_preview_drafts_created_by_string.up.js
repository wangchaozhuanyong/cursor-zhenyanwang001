async function tableExists(query, table) {
  const [rows] = await query('SHOW TABLES LIKE ?', [table]);
  return rows.length > 0;
}

async function columnExists(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

module.exports = {
  async up(query) {
    if (!(await tableExists(query, 'theme_preview_drafts'))) return;
    if (!(await columnExists(query, 'theme_preview_drafts', 'created_by'))) return;
    await query('ALTER TABLE theme_preview_drafts MODIFY created_by VARCHAR(36) NULL');
  },
};
