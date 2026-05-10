module.exports = {
  async up(query) {
    const { buildSearchKeywords } = require('../src/utils/searchKeywords');
    await query(`
      ALTER TABLE products
      ADD COLUMN search_keywords TEXT NULL
        COMMENT '搜索冗余关键词：名称、分类、标签、拼音首字母等'
        AFTER description
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    try {
      const [rows] = await query(`
        SELECT p.id, p.name, p.description, p.category_id, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
      `);
      for (const row of rows || []) {
        await query(
          'UPDATE products SET search_keywords = ? WHERE id = ? AND (search_keywords IS NULL OR search_keywords = "")',
          [buildSearchKeywords(row.name, row.description, row.category_id, row.category_name), row.id],
        );
      }
    } catch {
      await query(`
        UPDATE products
        SET search_keywords = CONCAT_WS(' ', name, description)
        WHERE search_keywords IS NULL OR search_keywords = ''
      `).catch(() => {});
    }

    await query(`
      CREATE TABLE IF NOT EXISTS search_terms (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        keyword VARCHAR(100) NOT NULL,
        normalized_keyword VARCHAR(100) NOT NULL,
        search_count INT NOT NULL DEFAULT 0,
        result_count INT NOT NULL DEFAULT 0,
        last_searched_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_search_terms_normalized (normalized_keyword),
        KEY idx_search_terms_hot (search_count, last_searched_at),
        KEY idx_search_terms_keyword (keyword)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
