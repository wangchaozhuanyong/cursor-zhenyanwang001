const mysql = require('mysql2/promise');

const isProduction = process.env.NODE_ENV === 'production';
const dbUser = process.env.DB_USER || (isProduction ? undefined : 'click_send_app');
const dbPassword = process.env.DB_PASSWORD || (isProduction ? undefined : '');

if (isProduction && (!dbUser || !dbPassword)) {
  throw new Error('Production DB_USER and DB_PASSWORD must be set');
}

/**
 * MySQL connections must use utf8mb4 to prevent Chinese product/category text
 * from being saved as mojibake. If production still shows broken text, inspect:
 *   SHOW VARIABLES LIKE 'character_set%';
 *   SHOW VARIABLES LIKE 'collation%';
 *   SHOW FULL COLUMNS FROM categories;
 * Existing corrupted rows require a separate data repair, not source conversion.
 */
const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT)    || 3306,
  user:            dbUser,
  password:        dbPassword,
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
