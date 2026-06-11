const db = require('../../../config/db');
const { ACTIVE_PRODUCT_WHERE } = require('../../product/productLifecycle');

async function upsertSearchTerm({ keyword, normalizedKeyword, resultCount }) {
  await db.query(
    `INSERT INTO search_terms (keyword, normalized_keyword, search_count, result_count, last_searched_at)
     VALUES (?, ?, 1, ?, NOW())
     ON DUPLICATE KEY UPDATE
       keyword = VALUES(keyword),
       search_count = search_count + 1,
       result_count = VALUES(result_count),
       last_searched_at = NOW()`,
    [keyword, normalizedKeyword, resultCount],
  );
}

async function selectHotTerms(limit) {
  const [rows] = await db.query(
    `SELECT
       id,
       keyword,
       normalized_keyword,
       search_count,
       result_count,
       last_searched_at,
       COALESCE(source, 'auto') AS source,
       COALESCE(is_pinned, 0) AS is_pinned,
       COALESCE(is_hidden, 0) AS is_hidden,
       COALESCE(sort_order, 0) AS sort_order
     FROM search_terms
     WHERE COALESCE(is_hidden, 0) = 0
       AND (result_count > 0 OR COALESCE(is_pinned, 0) = 1 OR COALESCE(source, 'auto') = 'manual')
     ORDER BY COALESCE(is_pinned, 0) DESC,
       COALESCE(sort_order, 0) ASC,
       search_count DESC,
       last_searched_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function selectSuggestions(keyword, like, expandedLike, limit) {
  const [termRows] = await db.query(
    `SELECT keyword, search_count, 'term' AS source
     FROM search_terms
     WHERE COALESCE(is_hidden, 0) = 0
       AND normalized_keyword LIKE ?
     ORDER BY search_count DESC, last_searched_at DESC
     LIMIT ?`,
    [`${keyword}%`, Math.max(limit, 5)],
  );

  const [productRows] = await db.query(
    `SELECT name AS keyword, 0 AS search_count, 'product' AS source
     FROM products
     WHERE ${ACTIVE_PRODUCT_WHERE}
       AND (
        name LIKE ?
        OR description LIKE ?
        OR search_keywords LIKE ?
       OR search_keywords LIKE ?
       )
     ORDER BY sales_count DESC, sort_order ASC, created_at DESC
     LIMIT ?`,
    [like, like, like, expandedLike || like, Math.max(limit, 5)],
  );

  return [...termRows, ...productRows];
}

async function countSearchResults(like) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM products
     WHERE ${ACTIVE_PRODUCT_WHERE}
       AND (
        name LIKE ?
        OR description LIKE ?
        OR search_keywords LIKE ?
       )`,
    [like, like, like],
  );
  return total;
}

async function selectAdminSearchTerms(filters) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(filters.pageSize, 10) || 20));
  const offset = (page - 1) * pageSize;
  const where = [];
  const params = [];
  const keyword = String(filters.keyword || '').trim();
  if (keyword) {
    where.push('(keyword LIKE ? OR normalized_keyword LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (filters.source === 'manual' || filters.source === 'auto') {
    where.push("COALESCE(source, 'auto') = ?");
    params.push(filters.source);
  }
  if (filters.visibility === 'hidden') {
    where.push('COALESCE(is_hidden, 0) = 1');
  } else if (filters.visibility === 'visible') {
    where.push('COALESCE(is_hidden, 0) = 0');
  }
  if (filters.pinned === '1') {
    where.push('COALESCE(is_pinned, 0) = 1');
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM search_terms ${whereSql}`,
    params,
  );
  const [rows] = await db.query(
    `SELECT
       id,
       keyword,
       normalized_keyword,
       search_count,
       result_count,
       last_searched_at,
       created_at,
       updated_at,
       COALESCE(source, 'auto') AS source,
       COALESCE(is_pinned, 0) AS is_pinned,
       COALESCE(is_hidden, 0) AS is_hidden,
       COALESCE(sort_order, 0) AS sort_order,
       remark
     FROM search_terms
     ${whereSql}
     ORDER BY COALESCE(is_pinned, 0) DESC,
       COALESCE(sort_order, 0) ASC,
       search_count DESC,
       last_searched_at DESC,
       id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return {
    list: rows,
    total: Number(total) || 0,
    page,
    pageSize,
    totalPages: Math.ceil((Number(total) || 0) / pageSize),
  };
}

async function upsertManualSearchTerm(payload) {
  const [result] = await db.query(
    `INSERT INTO search_terms
       (keyword, normalized_keyword, source, search_count, result_count, is_pinned, is_hidden, sort_order, remark, last_searched_at)
     VALUES (?, ?, 'manual', 0, ?, ?, ?, ?, ?, NULL)
     ON DUPLICATE KEY UPDATE
       keyword = VALUES(keyword),
       source = 'manual',
       result_count = GREATEST(result_count, VALUES(result_count)),
       is_pinned = VALUES(is_pinned),
       is_hidden = VALUES(is_hidden),
       sort_order = VALUES(sort_order),
       remark = VALUES(remark)`,
    [
      payload.keyword,
      payload.normalizedKeyword,
      payload.resultCount,
      payload.isPinned ? 1 : 0,
      payload.isHidden ? 1 : 0,
      payload.sortOrder,
      payload.remark || null,
    ],
  );
  const [[row]] = await db.query(
    'SELECT * FROM search_terms WHERE normalized_keyword = ? LIMIT 1',
    [payload.normalizedKeyword],
  );
  return row || { id: result.insertId };
}

async function updateSearchTerm(id, payload) {
  const fields = [];
  const params = [];
  if (payload.keyword !== undefined) {
    fields.push('keyword = ?', 'normalized_keyword = ?');
    params.push(payload.keyword, payload.normalizedKeyword);
  }
  if (payload.source !== undefined) {
    fields.push('source = ?');
    params.push(payload.source);
  }
  if (payload.isPinned !== undefined) {
    fields.push('is_pinned = ?');
    params.push(payload.isPinned ? 1 : 0);
  }
  if (payload.isHidden !== undefined) {
    fields.push('is_hidden = ?');
    params.push(payload.isHidden ? 1 : 0);
  }
  if (payload.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    params.push(payload.sortOrder);
  }
  if (payload.remark !== undefined) {
    fields.push('remark = ?');
    params.push(payload.remark || null);
  }
  if (fields.length === 0) return null;
  await db.query(
    `UPDATE search_terms SET ${fields.join(', ')} WHERE id = ?`,
    [...params, id],
  );
  const [[row]] = await db.query('SELECT * FROM search_terms WHERE id = ? LIMIT 1', [id]);
  return row || null;
}

async function deleteSearchTerm(id) {
  const [result] = await db.query('DELETE FROM search_terms WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  upsertSearchTerm,
  selectHotTerms,
  selectSuggestions,
  countSearchResults,
  selectAdminSearchTerms,
  upsertManualSearchTerm,
  updateSearchTerm,
  deleteSearchTerm,
};
