/**
 * 为「管理后台 → 订单管理」批量写入演示订单（直接写库，不走下单接口，不扣库存）。
 *
 * 用法（在 server 目录下，需已配置 .env 且库可连）：
 *   node scripts/seed-demo-orders.js
 *   node scripts/seed-demo-orders.js 15
 *   SEED_DEMO_USER_ID=<uuid> node scripts/seed-demo-orders.js 8
 *
 * 环境变量：
 *   SEED_DEMO_USER_ID — 指定下单用户 id；不填则取 users 表中最早一条未删除用户
 *   SEED_DEMO_NOTE_TAG — 写入订单 note 前缀，默认 [demo-seed]，便于日后识别/清理
 *
 * 清理演示数据（MySQL 示例，请先确认再执行）：
 *   DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE note LIKE '[demo-seed]%');
 *   DELETE FROM orders WHERE note LIKE '[demo-seed]%';
 */
/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/config/db');
const { generateId } = require('../src/utils/helpers');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../src/constants/status');

const NOTE_TAG = process.env.SEED_DEMO_NOTE_TAG || '[demo-seed]';

const DEMO_SPECS = [
  { status: ORDER_STATUS.PENDING, payment_status: PAYMENT_STATUS.PENDING, payment_method: 'online', label: '待付款-在线' },
  { status: ORDER_STATUS.PENDING, payment_status: PAYMENT_STATUS.PENDING, payment_method: 'whatsapp', label: '待付款-客服' },
  { status: ORDER_STATUS.PAID, payment_status: PAYMENT_STATUS.PAID, payment_method: 'online', label: '已付款待发货' },
  { status: ORDER_STATUS.PAID, payment_status: PAYMENT_STATUS.PAID, payment_method: 'mock', label: '已付款-mock' },
  {
    status: ORDER_STATUS.SHIPPED,
    payment_status: PAYMENT_STATUS.PAID,
    payment_method: 'online',
    tracking_no: 'JT' + Date.now().toString().slice(-10),
    carrier: 'J&T Express',
    label: '已发货',
  },
  {
    status: ORDER_STATUS.SHIPPED,
    payment_status: PAYMENT_STATUS.PAID,
    payment_method: 'whatsapp',
    tracking_no: '',
    carrier: '',
    label: '已发货无单号',
  },
  { status: ORDER_STATUS.COMPLETED, payment_status: PAYMENT_STATUS.PAID, payment_method: 'online', label: '已完成' },
  { status: ORDER_STATUS.COMPLETED, payment_status: PAYMENT_STATUS.PAID, payment_method: 'mock', label: '已完成-mock' },
  { status: ORDER_STATUS.CANCELLED, payment_status: PAYMENT_STATUS.PENDING, payment_method: 'online', label: '已取消' },
  { status: ORDER_STATUS.REFUNDING, payment_status: PAYMENT_STATUS.PAID, payment_method: 'online', label: '退款中' },
];

async function columnExists(table, column) {
  const [rows] = await db.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  return Array.isArray(rows) && rows.length > 0;
}

async function pickUserId() {
  const envId = (process.env.SEED_DEMO_USER_ID || '').trim();
  if (envId) {
    const [[row]] = await db.query('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1', [envId]);
    if (!row) throw new Error(`SEED_DEMO_USER_ID=${envId} 在 users 中不存在或已删除`);
    return row.id;
  }
  const [rows] = await db.query(
    'SELECT id FROM users WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1',
  );
  if (!rows.length) throw new Error('users 表无可用用户，请先注册/创建管理员或设置 SEED_DEMO_USER_ID');
  return rows[0].id;
}

async function pickProducts(limit) {
  const hasLc = await columnExists('products', 'lifecycle_status');
  const whereLc = hasLc ? 'AND lifecycle_status = 1' : '';
  const [rows] = await db.query(
    `SELECT id, name, cover_image, price, points
     FROM products
     WHERE deleted_at IS NULL ${whereLc}
     ORDER BY sort_order ASC, created_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

function demoOrderNo(seq) {
  const t = Date.now().toString(36).toUpperCase();
  return `DEMO-${t}-${String(seq).padStart(2, '0')}`;
}

async function insertOneOrder(conn, userId, product, spec, seq) {
  const orderId = generateId();
  const orderNo = demoOrderNo(seq);
  const qty = 1 + (seq % 3);
  const unit = Number(product.price);
  const rawAmount = Number((unit * qty).toFixed(2));
  const shippingFee = seq % 2 === 0 ? 0 : 8;
  const discountAmount = 0;
  const totalAmount = Number((rawAmount - discountAmount + shippingFee).toFixed(2));
  const totalPoints = 0;

  const note = `${NOTE_TAG} ${spec.label}`;
  const contactName = `演示收件人${seq}`;
  const contactPhone = `138001380${String(seq % 100).padStart(2, '0')}`;
  const address = `演示地址 · ${spec.label} · #${seq}`;

  await conn.query(
    `INSERT INTO orders (
      id, user_id, order_no, raw_amount, discount_amount, coupon_title,
      shipping_fee, shipping_name, tracking_no, carrier, coupon_uc_id,
      total_amount, total_points, status, payment_status,
      note, contact_name, contact_phone, address, payment_method
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      orderId,
      userId,
      orderNo,
      rawAmount,
      discountAmount,
      '',
      shippingFee,
      '标准快递',
      spec.tracking_no ?? '',
      spec.carrier ?? '',
      null,
      totalAmount,
      totalPoints,
      spec.status,
      spec.payment_status,
      note,
      contactName,
      contactPhone,
      address,
      spec.payment_method,
    ],
  );

  const itemId = generateId();
  await conn.query(
    `INSERT INTO order_items (id, order_id, product_id, product_name, product_image, price, points, qty)
     VALUES (?,?,?,?,?,?,?,?)`,
    [itemId, orderId, product.id, product.name, product.cover_image || '', unit, product.points || 0, qty],
  );

  return { orderId, orderNo };
}

async function main() {
  const countArg = parseInt(process.argv[2], 10);
  const total = Number.isFinite(countArg) && countArg > 0 ? countArg : DEMO_SPECS.length;

  const userId = await pickUserId();
  const products = await pickProducts(Math.max(5, total));
  if (!products.length) {
    throw new Error('products 表无可用商品（需未删除且 lifecycle_status=1 若存在该列），请先上架商品');
  }

  const created = [];
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < total; i += 1) {
      const spec = DEMO_SPECS[i % DEMO_SPECS.length];
      const product = products[i % products.length];
      const row = await insertOneOrder(conn, userId, product, spec, i + 1);
      created.push(row);
    }
    await conn.commit();
  } catch (e) {
    try {
      await conn.rollback();
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    conn.release();
  }

  console.log('演示订单已写入：');
  console.log(`  user_id: ${userId}`);
  console.log(`  笔数: ${created.length}`);
  console.log('  订单号:', created.map((c) => c.orderNo).join(', '));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
