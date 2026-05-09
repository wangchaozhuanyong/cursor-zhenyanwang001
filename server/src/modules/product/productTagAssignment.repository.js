const db = require('../../config/db');

/**
 * @param {string[]} productIds
 * @returns {Promise<Map<string, { id: string, name: string, color: string }[]>>}
 */
async function selectTagsByProductIds(productIds) {
  const map = new Map();
  if (!productIds.length) return map;
  const uniq = [...new Set(productIds)];
  const ph = uniq.map(() => '?').join(',');
  try {
    const [rows] = await db.query(
      `SELECT pta.product_id AS product_id, pt.id AS tag_id, pt.name AS tag_name, pt.color AS tag_color
       FROM product_tag_assignments pta
       INNER JOIN product_tags pt ON pt.id = pta.tag_id
       WHERE pta.product_id IN (${ph})
       ORDER BY pt.sort_order ASC, pt.name ASC`,
      uniq,
    );
    for (const id of uniq) map.set(id, []);
    for (const r of rows) {
      const list = map.get(r.product_id) || [];
      list.push({ id: r.tag_id, name: r.tag_name, color: r.tag_color || '金色' });
      map.set(r.product_id, list);
    }
    return map;
  } catch (e) {
    const msg = String(e && e.sqlMessage ? e.sqlMessage : e.message || e);
    if (e && (e.code === 'ER_BAD_FIELD_ERROR' || /Unknown column/i.test(msg))) {
      const [rows] = await db.query(
        `SELECT pta.product_id AS product_id, pt.id AS tag_id, pt.name AS tag_name
         FROM product_tag_assignments pta
         INNER JOIN product_tags pt ON pt.id = pta.tag_id
         WHERE pta.product_id IN (${ph})
         ORDER BY pt.sort_order ASC, pt.name ASC`,
        uniq,
      );
      for (const id of uniq) map.set(id, []);
      for (const r of rows) {
        const list = map.get(r.product_id) || [];
        list.push({ id: r.tag_id, name: r.tag_name, color: '金色' });
        map.set(r.product_id, list);
      }
      return map;
    }
    throw e;
  }
}

/**
 * @param {string} productId
 * @param {string[]} tagIds
 */
async function replaceAssignments(productId, tagIds) {
  const ids = [...new Set((tagIds || []).filter((x) => typeof x === 'string' && x.length > 0))];
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM product_tag_assignments WHERE product_id = ?', [productId]);
    for (const tid of ids) {
      await conn.query(
        'INSERT INTO product_tag_assignments (product_id, tag_id) VALUES (?, ?)',
        [productId, tid],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  selectTagsByProductIds,
  replaceAssignments,
};
