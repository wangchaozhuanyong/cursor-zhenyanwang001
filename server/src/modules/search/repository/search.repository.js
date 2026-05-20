const db = require('../../../config/db');

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
    `SELECT keyword, normalized_keyword, search_count, result_count, last_searched_at
     FROM search_terms
     WHERE result_count > 0
     ORDER BY search_count DESC, last_searched_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function selectSuggestions(keyword, like, expandedLike, limit) {
  const [termRows] = await db.query(
    `SELECT keyword, search_count, 'term' AS source
     FROM search_terms
     WHERE normalized_keyword LIKE ?
     ORDER BY search_count DESC, last_searched_at DESC
     LIMIT ?`,
    [`${keyword}%`, Math.max(limit, 5)],
  );

  const [productRows] = await db.query(
    `SELECT name AS keyword, 0 AS search_count, 'product' AS source
     FROM products
     WHERE lifecycle_status = 1
       AND deleted_at IS NULL
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
     WHERE lifecycle_status = 1
       AND deleted_at IS NULL
       AND (
        name LIKE ?
        OR description LIKE ?
        OR search_keywords LIKE ?
       )`,
    [like, like, like],
  );
  return total;
}

module.exports = {
  upsertSearchTerm,
  selectHotTerms,
  selectSuggestions,
  countSearchResults,
};
