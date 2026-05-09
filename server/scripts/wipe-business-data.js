/**
 * 清空业务/演示数据（订单、会员、商品、优惠券、购物车、支付流水等），用于「干净上线」场景。
 *
 * ⚠️ 若库里已有真实订单/真实支付记录，本脚本会一并删除 payment_* 与 orders；
 *    执行前请务必备份数据库（mysqldump 等）。只适合「全是演示数据」的环境。
 *
 * 【不会删除】schema_migrations、site_settings、payment_channels（支付渠道配置）、
 * permissions / roles / role_permissions、points_rules / referral_rules / points_usage_settings、
 * 以及 role ∈ { admin, super_admin } 的 users。
 *
 * 用法（在 server 目录）：
 *   WIPE_CONFIRM=YES_I_UNDERSTAND node scripts/wipe-business-data.js
 *
 * 生产环境额外强制（防误删）：
 *   NODE_ENV=production WIPE_CONFIRM=YES_I_UNDERSTAND node scripts/wipe-business-data.js
 *
 * 仅打印将要执行的步骤、不写库：
 *   DRY_RUN=1 WIPE_CONFIRM=YES_I_UNDERSTAND node scripts/wipe-business-data.js
 *
 * 可选：连同 CMS 内容页清空（慎用）
 *   WIPE_CONTENT_PAGES=1 WIPE_CONFIRM=YES_I_UNDERSTAND node scripts/wipe-business-data.js
 *
 * 可选：清空审计日志 audit_logs（默认保留）
 *   WIPE_AUDIT_LOGS=1 WIPE_CONFIRM=YES_I_UNDERSTAND node scripts/wipe-business-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = require('../src/config/db');

const DRY_RUN = process.env.DRY_RUN === '1';
const WIPE_CONFIRM = process.env.WIPE_CONFIRM === 'YES_I_UNDERSTAND';
const WIPE_CONTENT_PAGES = process.env.WIPE_CONTENT_PAGES === '1';
const WIPE_AUDIT_LOGS = process.env.WIPE_AUDIT_LOGS === '1';

/** 无外键时也安全：按表 TRUNCATE，失败（无此表）则跳过 */
const TRUNCATE_TABLES = [
  'home_engagement_events',
  'payment_webhook_events',
  'payment_events',
  'payment_reconciliations',
  'payment_fees',
  'payment_orders',
  'order_items',
  'orders',
  'return_requests',
  'cart_items',
  'user_coupons',
  'coupon_categories',
  'favorites',
  'browsing_history',
  'notifications',
  'product_reviews',
  'export_tasks',
  'addresses',
  'points_records',
  'points_accounts',
  'reward_transactions',
  // reward_records 在 reward_transactions 依赖之后清空
  'reward_records',
  'coupons',
  'product_tag_assignments',
  'products',
  'banners',
  'categories',
  'shipping_templates',
  'product_tags',
];

async function truncateTable(conn, table) {
  await conn.query(`TRUNCATE TABLE \`${table.replace(/`/g, '')}\``);
}

async function tableExists(conn, table) {
  const name = table.replace(/`/g, '');
  const [[db]] = await conn.query('SELECT DATABASE() AS d');
  const dbName = db.d;
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1`,
    [dbName, name],
  );
  return rows.length > 0;
}

async function main() {
  if (!WIPE_CONFIRM) {
    console.error(
      '\n❌ 拒绝执行：请先设置 WIPE_CONFIRM=YES_I_UNDERSTAND 表示你已理解会删除业务数据。\n',
    );
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY_RUN=1 — 不会修改数据库。\n');
  }

  const conn = await pool.getConnection();
  try {
    const [adminRows] = await conn.query(
      "SELECT COUNT(*) AS c FROM users WHERE role IN ('admin', 'super_admin')",
    );
    const admins = Number(adminRows?.[0]?.c ?? 0);

    console.log(`\n将保留管理员账号数量（role=admin|super_admin）: ${admins}`);
    console.log('将保留: site_settings, payment_channels, RBAC 表, points/referral 规则配置, schema_migrations\n');

    if (DRY_RUN) {
      console.log('将要 TRUNCATE 的表:', TRUNCATE_TABLES.join(', '));
      console.log('\n将要执行: DELETE FROM user_roles （非管理员）');
      console.log("将要执行: DELETE FROM users WHERE role NOT IN ('admin','super_admin')");
      if (WIPE_CONTENT_PAGES) console.log('将要执行: TRUNCATE content_pages');
      if (WIPE_AUDIT_LOGS) console.log('将要执行: TRUNCATE audit_logs');
      console.log('将要执行: TRUNCATE admin_logs');
      console.log('');
      process.exit(0);
    }

    await conn.beginTransaction();

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const t of TRUNCATE_TABLES) {
      if (!(await tableExists(conn, t))) {
        console.log(`跳过（表不存在）: ${t}`);
        continue;
      }
      await truncateTable(conn, t);
      console.log(`已清空表: ${t}`);
    }

    if (WIPE_AUDIT_LOGS && (await tableExists(conn, 'audit_logs'))) {
      await truncateTable(conn, 'audit_logs');
      console.log('已清空表: audit_logs');
    }

    if (WIPE_CONTENT_PAGES && (await tableExists(conn, 'content_pages'))) {
      await truncateTable(conn, 'content_pages');
      console.log('已清空表: content_pages');
    }

    if (await tableExists(conn, 'admin_logs')) {
      await truncateTable(conn, 'admin_logs');
      console.log('已清空表: admin_logs');
    }

    // RBAC 关联：删掉非管理员在 user_roles 中的行（若存在）
    if (await tableExists(conn, 'user_roles')) {
      const [urHeader] = await conn.query(`
        DELETE ur FROM user_roles ur
        INNER JOIN users u ON u.id = ur.user_id
        WHERE u.role NOT IN ('admin', 'super_admin')
      `);
      console.log(`已移除非管理员的 RBAC 关联行数: ${urHeader?.affectedRows ?? 0}`);
    }

    const [delHeader] = await conn.query(`
      DELETE FROM users
      WHERE role NOT IN ('admin', 'super_admin')
    `);
    console.log(`已删除前台用户数量: ${delHeader?.affectedRows ?? 0}`);

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();

    console.log('\n✅ 业务数据已清空完毕（管理员与站点配置等已按要求保留）。\n');
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('\n❌ 执行失败:', err.message || err);
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch(() => process.exit(1));
