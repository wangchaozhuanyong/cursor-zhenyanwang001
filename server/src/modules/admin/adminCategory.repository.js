const db = require('../../config/db');

async function selectAllCategoriesOrdered() {
  const [rows] = await db.query('SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY sort_order ASC');
  return rows;
}

async function insertCategory(params) {
  const { id, name, icon, sort_order } = params;
  await db.query(
    'INSERT INTO categories (id, name, icon, sort_order) VALUES (?,?,?,?)',
    [id, name, icon || '', sort_order || 0],
  );
}

async function updateCategoryDynamic(setFragments, values, id) {
  await db.query(`UPDATE categories SET ${setFragments.join(', ')} WHERE id = ?`, [...values, id]);
}

async function deleteCategoryById(id, deletedBy) {
  await db.query('UPDATE categories SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [deletedBy || null, id]);
}

async function restoreCategoryById(id) {
  await db.query('UPDATE categories SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
}

module.exports = {
  selectAllCategoriesOrdered,
  insertCategory,
  updateCategoryDynamic,
  deleteCategoryById,
  restoreCategoryById,
};
