/**
 * 空库首次部署：创建后续增量迁移 (001+) 所需的基础表。
 * 使用 JS 逐条执行（migrateRunner 对 .sql 整文件单次 query，不支持多语句）。
 */
const STMTS = [
  `CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100) NOT NULL DEFAULT '',
  invite_code VARCHAR(32) NOT NULL,
  parent_invite_code VARCHAR(32) NOT NULL DEFAULT '',
  avatar VARCHAR(500) DEFAULT '',
  points_balance INT NOT NULL DEFAULT 0,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  wechat VARCHAR(100) DEFAULT '',
  whatsapp VARCHAR(100) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_phone (phone),
  UNIQUE KEY uk_users_invite (invite_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  order_no VARCHAR(50) NOT NULL,
  raw_amount DECIMAL(10,2) DEFAULT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  coupon_title VARCHAR(100) NOT NULL DEFAULT '',
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  shipping_name VARCHAR(50) NOT NULL DEFAULT '',
  tracking_no VARCHAR(100) NOT NULL DEFAULT '',
  carrier VARCHAR(50) NOT NULL DEFAULT '',
  coupon_uc_id VARCHAR(36) DEFAULT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  total_points INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  note TEXT,
  contact_name VARCHAR(100) NOT NULL DEFAULT '',
  contact_phone VARCHAR(20) NOT NULL DEFAULT '',
  address TEXT,
  payment_method VARCHAR(32) NOT NULL DEFAULT 'whatsapp',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_no (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  product_name VARCHAR(255) NOT NULL DEFAULT '',
  product_image VARCHAR(500) DEFAULT '',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  qty INT NOT NULL DEFAULT 1,
  INDEX idx_oi_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(500) DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cover_image VARCHAR(500) DEFAULT '',
  images JSON DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  category_id VARCHAR(36) DEFAULT NULL,
  stock INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  description TEXT,
  is_recommended TINYINT(1) NOT NULL DEFAULT 0,
  is_new TINYINT(1) NOT NULL DEFAULT 0,
  is_hot TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_products_cat (category_id),
  INDEX idx_products_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(200) NOT NULL DEFAULT '',
  image VARCHAR(500) NOT NULL DEFAULT '',
  link VARCHAR(500) DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  publish_status VARCHAR(20) NOT NULL DEFAULT 'published',
  last_modified_by VARCHAR(36) DEFAULT NULL,
  last_modified_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT '',
  type VARCHAR(32) NOT NULL DEFAULT 'amount',
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'available',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_coupon_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS user_coupons (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  coupon_id VARCHAR(36) NOT NULL,
  claimed_at DATETIME DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'available',
  used_at DATETIME DEFAULT NULL,
  INDEX idx_uc_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cart_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS addresses (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT '',
  phone VARCHAR(20) NOT NULL DEFAULT '',
  address VARCHAR(500) NOT NULL DEFAULT '',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_addr_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS shipping_templates (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  regions TEXT,
  base_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  free_above DECIMAL(10,2) DEFAULT NULL,
  extra_per_kg DECIMAL(10,2) DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS product_reviews (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  nickname VARCHAR(100) DEFAULT '',
  avatar VARCHAR(500) DEFAULT '',
  rating INT NOT NULL DEFAULT 5,
  content TEXT,
  images JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'normal',
  admin_reply TEXT,
  admin_reply_at DATETIME DEFAULT NULL,
  deleted_at DATETIME DEFAULT NULL,
  deleted_by VARCHAR(36) DEFAULT NULL,
  likes_count INT NOT NULL DEFAULT 0,
  INDEX idx_pr_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS content_pages (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT '',
  body MEDIUMTEXT,
  publish_status VARCHAR(20) NOT NULL DEFAULT 'published',
  last_modified_by VARCHAR(36) DEFAULT NULL,
  last_modified_at DATETIME DEFAULT NULL,
  UNIQUE KEY uk_content_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) DEFAULT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'system',
  title VARCHAR(200) NOT NULL DEFAULT '',
  content TEXT,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  publish_status VARCHAR(20) NOT NULL DEFAULT 'published',
  last_modified_by VARCHAR(36) DEFAULT NULL,
  last_modified_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id),
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS browsing_history (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bh_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_fav_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS return_requests (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  order_id VARCHAR(36) NOT NULL,
  order_no VARCHAR(50) NOT NULL DEFAULT '',
  type VARCHAR(32) NOT NULL DEFAULT 'refund',
  reason VARCHAR(200) DEFAULT '',
  description TEXT,
  images JSON DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rr_user (user_id),
  INDEX idx_rr_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS points_records (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  action VARCHAR(64) NOT NULL DEFAULT '',
  amount INT NOT NULL DEFAULT 0,
  description VARCHAR(500) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_points_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS reward_records (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  order_id VARCHAR(36) DEFAULT NULL,
  order_no VARCHAR(50) DEFAULT '',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  rate DECIMAL(10,4) DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rr_uid (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value MEDIUMTEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

module.exports = {
  async up(query) {
    for (const sql of STMTS) {
      await query(sql);
    }
  },
};
