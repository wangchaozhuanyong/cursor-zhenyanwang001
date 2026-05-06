const REFERRAL_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS referral_rules (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  level INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  reward_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ref_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const POINTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS points_rules (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  action VARCHAR(64) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_points_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

module.exports = {
  async up(query) {
    await query(REFERRAL_TABLE_SQL);
    await query(POINTS_TABLE_SQL);

    await query(
      "INSERT IGNORE INTO referral_rules (level, name, reward_percent, enabled) VALUES (1, '一级返现', 10, 1), (2, '二级返现', 5, 1)",
    );

    await query(
      "INSERT IGNORE INTO points_rules (name, action, points, enabled) VALUES ('注册奖励', 'register', 100, 1), ('首单奖励', 'first_order', 200, 1), ('每日签到', 'daily_checkin', 10, 1)",
    );
  },
};
