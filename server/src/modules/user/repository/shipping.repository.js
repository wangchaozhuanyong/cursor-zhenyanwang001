const db = require('../../../config/db');

async function selectTemplatesOrdered() {
  const [rows] = await db.query(
    'SELECT * FROM shipping_templates WHERE enabled = 1 ORDER BY is_default DESC, id ASC',
  );
  return rows;
}

async function selectTemplateById(id) {
  const [[row]] = await db.query('SELECT * FROM shipping_templates WHERE id = ? AND enabled = 1', [id]);
  return row || null;
}

async function selectDefaultEnabledTemplate() {
  const [[row]] = await db.query(
    'SELECT * FROM shipping_templates WHERE enabled = 1 ORDER BY is_default DESC, id ASC LIMIT 1',
  );
  return row || null;
}

module.exports = {
  selectTemplatesOrdered,
  selectTemplateById,
  selectDefaultEnabledTemplate,
};



