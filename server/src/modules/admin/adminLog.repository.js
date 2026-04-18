const db = require('../../config/db');

async function countAdminLogs() {
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM admin_logs');
  return total;
}

async function selectAdminLogsPage(pageSize, offset) {
  const [rows] = await db.query(
    'SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [pageSize, offset],
  );
  return rows;
}

module.exports = {
  countAdminLogs,
  selectAdminLogsPage,
};
