const db = require('../../../config/db');

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

async function insertAdminLogRow(params) {
  const { id, adminId, operator, action, detail } = params;
  await db.query(
    'INSERT INTO admin_logs (id, admin_id, operator, action, detail) VALUES (?,?,?,?,?)',
    [id, adminId, operator, action, detail],
  );
}

module.exports = {
  countAdminLogs,
  selectAdminLogsPage,
  insertAdminLogRow,
};



