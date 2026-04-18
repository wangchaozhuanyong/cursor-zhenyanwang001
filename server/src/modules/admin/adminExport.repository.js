const db = require('../../config/db');
const { EXPORT_TASK_STATUS } = require('../../constants/status');

async function insertTask(id, fileName, type, createdBy) {
  await db.query(
    'INSERT INTO export_tasks (id, file_name, type, status, created_by) VALUES (?,?,?,?,?)',
    [id, fileName, type, EXPORT_TASK_STATUS.PENDING, createdBy],
  );
}

async function updateTaskSuccess(id, filePath, fileSize) {
  await db.query(
    'UPDATE export_tasks SET status = ?, file_path = ?, file_size = ?, finished_at = NOW() WHERE id = ?',
    [EXPORT_TASK_STATUS.SUCCESS, filePath, fileSize, id],
  );
}

async function updateTaskFailure(id, errorMessage) {
  await db.query(
    'UPDATE export_tasks SET status = ?, error_message = ?, finished_at = NOW() WHERE id = ?',
    [EXPORT_TASK_STATUS.FAILED, String(errorMessage).slice(0, 500), id],
  );
}

async function selectTaskById(id) {
  const [[row]] = await db.query('SELECT * FROM export_tasks WHERE id = ?', [id]);
  return row || null;
}

async function selectTasks(limit = 50) {
  const [rows] = await db.query('SELECT * FROM export_tasks ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows;
}

async function deleteExpiredTasks(maxAgeDays = 30) {
  const [result] = await db.query(
    `DELETE FROM export_tasks WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [maxAgeDays],
  );
  return result.affectedRows;
}

module.exports = {
  insertTask,
  updateTaskSuccess,
  updateTaskFailure,
  selectTaskById,
  selectTasks,
  deleteExpiredTasks,
};
