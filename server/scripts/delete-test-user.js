/**
 * 删除联调/测试用前台用户（按手机号），默认仅预览。
 *
 * 用法（在 server 目录）：
 *   node scripts/delete-test-user.js +601144789629
 *   node scripts/delete-test-user.js +601144789629 --execute
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../src/config/db');

const phoneArg = (process.argv[2] || '+601144789629').trim();
const execute = process.argv.includes('--execute');

async function tableExists(conn, table) {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS c
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  );
  return Number(row?.c || 0) > 0;
}

async function columnExists(conn, table, column) {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS c
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number(row?.c || 0) > 0;
}

async function deleteByUserId(conn, table, column, userId) {
  if (!(await tableExists(conn, table))) return 0;
  if (!(await columnExists(conn, table, column))) return 0;
  const [r] = await conn.query(`DELETE FROM \`${table}\` WHERE \`${column}\` = ?`, [userId]);
  return Number(r?.affectedRows || 0);
}

async function deleteUserOrders(conn, userId) {
  const stats = {};
  if (!(await tableExists(conn, 'orders'))) return stats;

  const [orders] = await conn.query('SELECT id FROM orders WHERE user_id = ?', [userId]);
  const orderIds = orders.map((o) => o.id);
  if (!orderIds.length) return stats;

  const ph = orderIds.map(() => '?').join(', ');
  const childTables = [
    'order_items',
    'payment_webhook_events',
    'payment_events',
    'payment_reconciliations',
    'payment_fees',
    'payment_orders',
    'logistics_tracks',
    'return_requests',
  ];

  for (const table of childTables) {
    if (!(await tableExists(conn, table))) continue;
    if (!(await columnExists(conn, table, 'order_id'))) continue;
    const [r] = await conn.query(`DELETE FROM \`${table}\` WHERE order_id IN (${ph})`, orderIds);
    stats[`${table}_deleted`] = Number(r?.affectedRows || 0);
  }

  const [o] = await conn.query('DELETE FROM orders WHERE user_id = ?', [userId]);
  stats.orders_deleted = Number(o?.affectedRows || 0);
  return stats;
}

async function purgeStorefrontUser(userId) {
  const conn = await db.getConnection();
  const stats = {};
  try {
    await conn.beginTransaction();

    const steps = [
      ['coupon_events', 'user_id'],
      ['user_coupons', 'user_id'],
      ['cart_items', 'user_id'],
      ['checkout_abandonments', 'user_id'],
      ['favorites', 'user_id'],
      ['browsing_history', 'user_id'],
      ['notifications', 'user_id'],
      ['addresses', 'user_id'],
      ['points_gift_redemptions', 'user_id'],
      ['points_records', 'user_id'],
      ['points_accounts', 'user_id'],
      ['reward_transactions', 'user_id'],
      ['reward_records', 'user_id'],
      ['home_engagement_events', 'user_id'],
      ['user_auth_identities', 'user_id'],
      ['oauth_accounts', 'user_id'],
      ['user_tag_assignments', 'user_id'],
      ['user_restrictions', 'user_id'],
      ['privacy_consents', 'user_id'],
      ['user_login_audits', 'user_id'],
      ['user_roles', 'user_id'],
    ];

    if (execute) {
      Object.assign(stats, await deleteUserOrders(conn, userId));
    }

    for (const [table, column] of steps) {
      const key = `${table}_deleted`;
      stats[key] = execute ? await deleteByUserId(conn, table, column, userId) : 0;
    }

    if (execute) {
      const [u] = await conn.query('DELETE FROM users WHERE id = ?', [userId]);
      stats.users_deleted = Number(u?.affectedRows || 0);
    }

    await conn.commit();
    return stats;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function main() {
  const [[user]] = await db.query(
    'SELECT id, phone, nickname, role FROM users WHERE phone = ? LIMIT 1',
    [phoneArg],
  );
  if (!user?.id) {
    console.log(JSON.stringify({ found: false, phone: phoneArg }, null, 2));
    process.exit(0);
  }

  if (user.role === 'admin' || user.role === 'super_admin') {
    console.error('拒绝删除管理员账号，请改用 purge-admin-user.js');
    process.exit(1);
  }

  const preview = {
    found: true,
    user: { id: user.id, phone: user.phone, nickname: user.nickname, role: user.role },
    execute,
  };

  if (!execute) {
    console.log(JSON.stringify({ ...preview, message: '加 --execute 后执行删除' }, null, 2));
    await db.end();
    return;
  }

  const stats = await purgeStorefrontUser(user.id);
  console.log(JSON.stringify({ ...preview, deleted: stats }, null, 2));
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
