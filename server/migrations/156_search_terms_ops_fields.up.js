module.exports = {
  async up(query) {
    async function addColumn(sql, ignoredCode = 'ER_DUP_FIELDNAME') {
      try {
        await query(sql);
      } catch (e) {
        if (e.code !== ignoredCode) throw e;
      }
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

    await addColumn(`
      ALTER TABLE search_terms
      ADD COLUMN source ENUM('auto','manual') NOT NULL DEFAULT 'auto'
        COMMENT '关键词来源：自动统计或后台手工配置'
        AFTER normalized_keyword
    `);
    await addColumn(`
      ALTER TABLE search_terms
      ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '是否人工置顶展示'
        AFTER result_count
    `);
    await addColumn(`
      ALTER TABLE search_terms
      ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '是否从前台热门搜索和联想中隐藏'
        AFTER is_pinned
    `);
    await addColumn(`
      ALTER TABLE search_terms
      ADD COLUMN sort_order INT NOT NULL DEFAULT 0
        COMMENT '人工排序，数字越小越靠前'
        AFTER is_hidden
    `);
    await addColumn(`
      ALTER TABLE search_terms
      ADD COLUMN remark VARCHAR(255) NULL
        COMMENT '后台备注'
        AFTER sort_order
    `);

    try {
      await query('ALTER TABLE search_terms ADD KEY idx_search_terms_ops (is_hidden, is_pinned, sort_order, search_count, last_searched_at)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }
  },
};
