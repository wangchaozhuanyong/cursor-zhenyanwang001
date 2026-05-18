const mysql = require('mysql2/promise');

/**
 * 连接字符集须为 utf8mb4，避免中文分类/商品名乱码。
 * 若页面仍乱码，在 MySQL 执行：
 *   SHOW VARIABLES LIKE 'character_set%';
 *   SHOW FULL COLUMNS FROM categories;
 *   SELECT id, name, HEX(name) FROM categories LIMIT 20;
 * 表/字段与历史数据也需为 utf8mb4；已写入的乱码需单独修复数据。
 */
const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT)    || 3306,
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',
  database:        process.env.DB_NAME     || 'click_send_shop',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      return field.string() === '1';
    }
    return next();
  },
});

module.exports = pool;
