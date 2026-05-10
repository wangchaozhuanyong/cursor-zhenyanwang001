/**
 * 写入少量「上架中」演示商品 + 可见分类，便于公网空库联调首页 / 分类 / 购物车。
 *
 * 用法（在 server 目录）:
 *   npm run seed:demo-products
 *   SEED_DEMO_PRODUCTS_REFRESH=1 npm run seed:demo-products
 *
 * 行为:
 * - 默认：若已有 lifecycle_status=1 且未删除的商品，则跳过（避免污染真实库）。
 * - SEED_DEMO_PRODUCTS_REFRESH=1：先将 search_keywords='[demo-seed-product]' 的商品软删除，再插入一批新演示数据。
 *
 * 清理演示商品（软删除）:
 *   UPDATE products SET deleted_at = NOW()
 *   WHERE search_keywords = '[demo-seed-product]' AND deleted_at IS NULL;
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const db = require("../src/config/db");
const { generateId } = require("../src/utils/helpers");
const productRepo = require("../src/modules/admin/adminProduct.repository");
const categoryRepo = require("../src/modules/admin/adminCategory.repository");

const DEMO_KW = "[demo-seed-product]";

async function countShelvedProducts() {
  const [[{ n }]] = await db.query(
    `SELECT COUNT(*) AS n FROM products
     WHERE deleted_at IS NULL AND lifecycle_status = 1`,
  );
  return Number(n) || 0;
}

async function softDeleteOldDemos() {
  await db.query(
    `UPDATE products SET deleted_at = NOW()
     WHERE search_keywords = ? AND deleted_at IS NULL`,
    [DEMO_KW],
  );
}

async function pickOrCreateCategoryId() {
  const [rows] = await db.query(
    `SELECT id FROM categories
     WHERE deleted_at IS NULL AND is_active = 1 AND is_visible = 1
     ORDER BY sort_order ASC, id ASC
     LIMIT 1`,
  );
  if (rows.length) return rows[0].id;

  const id = generateId();
  await categoryRepo.insertCategory({
    id,
    parent_id: null,
    name: "演示分类",
    icon: "",
    icon_url: "",
    sort_order: 0,
    is_visible: true,
  });
  return id;
}

const COVERS = [
  "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&q=80&w=600",
];

const SPECS = [
  { name: "演示·曜石黑机械腕表", price: 12800, original_price: 13800, is_hot: 1, is_new: 0, is_recommended: 1, sort: 10 },
  { name: "演示·先锋解构墨镜", price: 2450, original_price: 2590, is_hot: 1, is_new: 1, is_recommended: 0, sort: 20 },
  { name: "演示·陨石降噪耳机", price: 3299, original_price: 3599, is_hot: 0, is_new: 1, is_recommended: 1, sort: 30 },
  { name: "演示·暗物质胶囊香水", price: 890, original_price: 990, is_hot: 0, is_new: 0, is_recommended: 1, sort: 40 },
];

async function insertDemoRow(categoryId, spec, cover, idx) {
  const id = generateId();
  const imagesJson = JSON.stringify([cover]);
  const desc = `${spec.name}（${DEMO_KW}，可安全删除）`;
  await productRepo.insertProduct({
    id,
    name: spec.name,
    cover_image: cover,
    video_url: "",
    imagesJson,
    price: spec.price,
    original_price: spec.original_price,
    sales_count: 10 + idx * 5,
    points: Math.max(1, Math.floor(spec.price / 100)),
    category_id: categoryId,
    stock: 99,
    status: "active",
    lifecycle_status: 1,
    sort_order: spec.sort,
    description: desc,
    search_keywords: DEMO_KW,
    is_recommended: !!spec.is_recommended,
    is_new: !!spec.is_new,
    is_hot: !!spec.is_hot,
  });
}

async function main() {
  const refresh = process.env.SEED_DEMO_PRODUCTS_REFRESH === "1";
  const shelved = await countShelvedProducts();

  if (shelved > 0 && !refresh) {
    console.log(
      `已有 ${shelved} 个上架商品，跳过写入演示数据。\n` +
        "若需刷新本脚本写入的演示商品，请执行：SEED_DEMO_PRODUCTS_REFRESH=1 npm run seed:demo-products",
    );
    return;
  }

  if (refresh) {
    await softDeleteOldDemos();
    console.log("已软删除旧演示商品（search_keywords 匹配）");
  }

  const categoryId = await pickOrCreateCategoryId();
  console.log("分类 id:", categoryId);

  for (let i = 0; i < SPECS.length; i += 1) {
    const cover = COVERS[i % COVERS.length];
    await insertDemoRow(categoryId, SPECS[i], cover, i);
    console.log("  +", SPECS[i].name);
  }

  console.log("\n完成：已写入", SPECS.length, "个演示商品（首页热门/新品/推荐区块将有数据）。");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
