/**
 * 商品与分类初始化（seed），保证 GET /api/products 能列出至少 10 条 status=active 的商品。
 *
 * 用法（在 server 目录）：
 *   node scripts/seed-products.js
 *
 * 依赖：已执行迁移（存在 categories / products 表），.env 中 DB_* 正确。
 * 可重复执行：分类与商品使用固定 id，采用 INSERT IGNORE（已存在则跳过）。
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/config/db');

/** 固定 UUID，便于幂等插入 */
const CATEGORIES = [
  { id: 'b1a2f0c1-1111-4111-8111-000000000001', name: '礼品文具', sort_order: 1 },
  { id: 'b1a2f0c1-1111-4111-8111-000000000002', name: '数码配件', sort_order: 2 },
  { id: 'b1a2f0c1-1111-4111-8111-000000000003', name: '家居生活', sort_order: 3 },
];

const PRODUCTS = [
  { id: 'c2b3e1d1-2222-4222-8222-000000000001', name: '礼盒套装 A', price: '29.90', stock: 100, category_id: 'b1a2f0c1-1111-4111-8111-000000000001', sort_order: 1, points: 5 },
  { id: 'c2b3e1d1-2222-4222-8222-000000000002', name: '创意笔记本', price: '18.50', stock: 200, category_id: 'b1a2f0c1-1111-4111-8111-000000000001', sort_order: 2, points: 3 },
  { id: 'c2b3e1d1-2222-4222-8222-000000000003', name: '钢笔礼盒', price: '88.00', stock: 50, category_id: 'b1a2f0c1-1111-4111-8111-000000000001', sort_order: 3, points: 10 },
  { id: 'c2b3e1d1-2222-4222-8222-000000000004', name: 'USB-C 数据线', price: '35.00', stock: 300, category_id: 'b1a2f0c1-1111-4111-8111-000000000002', sort_order: 1, points: 4 },
  { id: 'c2b3e1d1-2222-4222-8222-000000000005', name: '无线鼠标', price: '79.00', stock: 80, category_id: 'b1a2f0c1-1111-4111-8111-000000000002', sort_order: 2, points: 8 },
  { id: 'c2b3e1d1-2222-4222-8222-000000000006', name: '手机支架', price: '22.00', stock: 150, category_id: 'b1a2f0c1-1111-4111-8111-000000000002', sort_order: 3, points: 2 },
  { id: 'c2b3e1d1-2222-4222-8222-000000000007', name: '蓝牙音箱', price: '199.00', stock: 40, category_id: 'b1a2f0c1-1111-4111-8111-000000000002', sort_order: 4, points: 20 },
  { id: 'c2b3e1d1-2222-4222-8222-000000000008', name: '保温杯 500ml', price: '65.00', stock: 120, category_id: 'b1a2f0c1-1111-4111-8111-000000000003', sort_order: 1, points: 6 },
  { id: 'c2b3e1d1-2222-4222-8222-000000000009', name: '香薰蜡烛', price: '45.00', stock: 90, category_id: 'b1a2f0c1-1111-4111-8111-000000000003', sort_order: 2, points: 5 },
  { id: 'c2b3e1d1-2222-4222-8222-00000000000a', name: '收纳盒三件套', price: '55.00', stock: 70, category_id: 'b1a2f0c1-1111-4111-8111-000000000003', sort_order: 3, points: 5 },
  { id: 'c2b3e1d1-2222-4222-8222-00000000000b', name: '桌垫大号', price: '32.00', stock: 110, category_id: 'b1a2f0c1-1111-4111-8111-000000000003', sort_order: 4, points: 3 },
  { id: 'c2b3e1d1-2222-4222-8222-00000000000c', name: '节日贺卡套装', price: '15.00', stock: 500, category_id: 'b1a2f0c1-1111-4111-8111-000000000001', sort_order: 4, points: 1 },
];

async function main() {
  for (const c of CATEGORIES) {
    await db.query(
      `INSERT IGNORE INTO categories (id, name, icon, sort_order, is_active)
       VALUES (?, ?, '', ?, 1)`,
      [c.id, c.name, c.sort_order],
    );
  }

  for (const p of PRODUCTS) {
    await db.query(
      `INSERT IGNORE INTO products (
        id, name, cover_image, price, points, category_id, stock, status,
        sort_order, description, is_recommended, is_new, is_hot
      ) VALUES (?, ?, '', ?, ?, ?, ?, 'active', ?, '', 0, 0, 0)`,
      [
        p.id,
        p.name,
        p.price,
        p.points,
        p.category_id,
        p.stock,
        p.sort_order,
      ],
    );
  }

  const [[{ n }]] = await db.query(
    'SELECT COUNT(*) AS n FROM products WHERE status = ?',
    ['active'],
  );
  console.log(`seed-products: categories=${CATEGORIES.length}, products inserted (ignore duplicates)=${PRODUCTS.length}`);
  console.log(`active products in DB: ${n}`);
  if (Number(n) < 10) {
    console.warn('warning: active product count < 10 (may already have partial data or failed inserts)');
  }
  await db.end().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
