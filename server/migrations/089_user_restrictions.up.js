module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS user_restrictions (
        user_id VARCHAR(36) NOT NULL PRIMARY KEY,
        order_restricted TINYINT(1) NOT NULL DEFAULT 0,
        coupon_restricted TINYINT(1) NOT NULL DEFAULT 0,
        comment_restricted TINYINT(1) NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_restrictions_user_id
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    await query(`
      INSERT INTO user_restrictions (user_id, order_restricted, coupon_restricted, comment_restricted)
      SELECT
        u.id,
        CASE WHEN u.account_status = 'order_limited' THEN 1 ELSE 0 END,
        CASE WHEN u.account_status = 'coupon_limited' THEN 1 ELSE 0 END,
        CASE WHEN u.account_status = 'comment_limited' THEN 1 ELSE 0 END
      FROM users u
      WHERE u.deleted_at IS NULL
      ON DUPLICATE KEY UPDATE
        order_restricted = VALUES(order_restricted),
        coupon_restricted = VALUES(coupon_restricted),
        comment_restricted = VALUES(comment_restricted)
    `).catch(() => {});

    await query(`
      UPDATE users
      SET account_status = 'normal'
      WHERE account_status IN ('order_limited', 'coupon_limited', 'comment_limited')
    `).catch(() => {});
  },
};

