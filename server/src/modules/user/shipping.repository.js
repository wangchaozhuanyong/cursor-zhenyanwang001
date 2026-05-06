const db = require('../../config/db');

async function selectTemplatesOrdered() {
  const [rows] = await db.query('SELECT * FROM shipping_templates ORDER BY id ASC');
  return rows;
}

async function selectTemplateById(id) {
  const [[row]] = await db.query('SELECT * FROM shipping_templates WHERE id = ? AND enabled = 1', [id]);
  return row || null;
}

module.exports = {
  selectTemplatesOrdered,
  selectTemplateById,
};
