module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS review_likes (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        review_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_review_user (review_id, user_id),
        KEY idx_review_likes_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      ALTER TABLE review_likes
        MODIFY COLUMN id VARCHAR(36) NOT NULL,
        MODIFY COLUMN review_id VARCHAR(36) NOT NULL,
        MODIFY COLUMN user_id VARCHAR(36) NOT NULL,
        MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);

    await query(`
      ALTER TABLE product_reviews
        ADD COLUMN likes_count INT NOT NULL DEFAULT 0
    `).catch((err) => {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    });

    await query(`
      ALTER TABLE review_likes
        ADD KEY idx_review_likes_user (user_id)
    `).catch((err) => {
      if (err.code !== 'ER_DUP_KEYNAME') throw err;
    });
  },
};
