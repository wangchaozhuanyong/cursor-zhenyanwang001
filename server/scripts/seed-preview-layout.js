/**
 * Seed local preview layout data.
 *
 * This script is intentionally local-only. It fills enough storefront/admin
 * content for layout work without depending on production data.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../src/config/db');

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const PREFIX = 'preview-seed';

function assertLocalOnly() {
  const host = String(process.env.DB_HOST || '').trim();
  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
  if (!LOCAL_HOSTS.has(host) && process.env.ALLOW_PREVIEW_SEED_REMOTE !== '1') {
    throw new Error(`Refusing to seed non-local database host: ${host || '(empty)'}`);
  }
  if (nodeEnv === 'production' && process.env.ALLOW_PREVIEW_SEED_PRODUCTION !== '1') {
    throw new Error('Refusing to seed while NODE_ENV=production');
  }
}

function productId(index) {
  return `${PREFIX}-product-${String(index).padStart(2, '0')}`;
}

const images = [
  '/assets/home-banners/home-hero-01-platform-bg.webp',
  '/assets/home-banners/home-hero-02-visa-study-bg.webp',
  '/assets/home-banners/home-hero-03-local-goods-bg.webp',
  '/assets/home-banners/home-hero-04-renovation-bg.webp',
  '/assets/home-banners/home-hero-05-support-bg.webp',
  '/assets/banner1.jpg',
];

const productImages = [
  '/assets/home-banners/home-hero-01-platform-bg-mobile.webp',
  '/assets/home-banners/home-hero-02-visa-study-bg-mobile.webp',
  '/assets/home-banners/home-hero-03-local-goods-bg-mobile.webp',
  '/assets/home-banners/home-hero-04-renovation-bg-mobile.webp',
  '/assets/home-banners/home-hero-05-support-bg-mobile.webp',
  '/assets/banner1.jpg',
];

const categories = [
  { id: `${PREFIX}-cat-gift`, name: 'Preview Gifts', icon: 'gift', sort: 1 },
  { id: `${PREFIX}-cat-digital`, name: 'Preview Digital', icon: 'digital', sort: 2 },
  { id: `${PREFIX}-cat-home`, name: 'Preview Home', icon: 'home', sort: 3 },
  { id: `${PREFIX}-cat-local`, name: 'Preview Local Goods', icon: 'local', sort: 4 },
  { id: `${PREFIX}-cat-deals`, name: 'Preview Deals', icon: 'deals', sort: 5 },
  { id: `${PREFIX}-cat-support`, name: 'Preview Support', icon: 'help', sort: 6 },
];

const banners = [
  {
    id: `${PREFIX}-banner-01`,
    title: '大马通平台总览',
    description: '大马通面向马来西亚中文用户的一站式服务入口。',
    image: images[0],
    link: '',
    sort: 1,
  },
  {
    id: `${PREFIX}-banner-02`,
    title: '签证留学第二家园',
    description: '适合需要了解签证、留学、第二家园服务的用户。',
    image: images[1],
    link: '',
    sort: 2,
  },
  {
    id: `${PREFIX}-banner-03`,
    title: '本地优选与中国好物',
    description: '集合零食饮料、日用好物与精选商品。',
    image: images[2],
    link: '',
    sort: 3,
  },
  {
    id: `${PREFIX}-banner-04`,
    title: '商业装修服务',
    description: '面向门店、办公室和商业空间的装修服务。',
    image: images[3],
    link: '',
    sort: 4,
  },
  {
    id: `${PREFIX}-banner-05`,
    title: '本地中文客服与订单支持',
    description: '提供中文咨询、下单、售后与订单跟进。',
    image: images[4],
    link: '',
    sort: 5,
  },
];

const navItems = [
  { id: `${PREFIX}-nav-products`, title: 'All Products', icon: 'bag', link: '/products', target: 'url', sort: 1 },
  { id: `${PREFIX}-nav-gifts`, title: 'Gifts', icon: 'gift', link: '/products', target: 'category', category: categories[0].id, sort: 2 },
  { id: `${PREFIX}-nav-digital`, title: 'Digital', icon: 'digital', link: '/products', target: 'category', category: categories[1].id, sort: 3 },
  { id: `${PREFIX}-nav-home`, title: 'Home', icon: 'home', link: '/products', target: 'category', category: categories[2].id, sort: 4 },
  { id: `${PREFIX}-nav-local`, title: 'Local', icon: 'local', link: '/products', target: 'category', category: categories[3].id, sort: 5 },
  { id: `${PREFIX}-nav-deals`, title: 'Deals', icon: 'deals', link: '/products', target: 'category', category: categories[4].id, sort: 6 },
  { id: `${PREFIX}-nav-policy`, title: 'Policy', icon: 'info', link: '/content/privacy-policy', target: 'url', sort: 7 },
  { id: `${PREFIX}-nav-help`, title: 'Help', icon: 'help', link: '/content/contact-us', target: 'url', sort: 8 },
];

function makeProducts() {
  const rows = [];
  for (let i = 1; i <= 36; i += 1) {
    const category = categories[(i - 1) % categories.length];
    const price = 19 + (i * 7) % 380;
    const cover = productImages[(i - 1) % productImages.length];
    rows.push({
      id: productId(i),
      name: `Preview Product ${String(i).padStart(2, '0')}`,
      cover,
      imageList: [cover, productImages[i % productImages.length], productImages[(i + 1) % productImages.length]],
      price,
      originalPrice: price + 30 + (i % 5) * 12,
      points: 2 + (i % 40),
      categoryId: category.id,
      stock: 30 + i * 3,
      sort: -100 + i,
      sales: i * 11,
      recommended: i % 2 === 0 ? 1 : 0,
      isNew: i % 3 === 0 ? 1 : 0,
      hot: i % 5 === 0 ? 1 : 0,
      description: `Local preview product ${i}. Used for storefront density, gallery, card, list, and admin layout checks.`,
    });
  }
  return rows;
}

async function tableExists(table) {
  const [[dbName]] = await db.query('SELECT DATABASE() AS name');
  const [rows] = await db.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1',
    [dbName.name, table],
  );
  return rows.length > 0;
}

async function columnExists(table, column) {
  const [[dbName]] = await db.query('SELECT DATABASE() AS name');
  const [rows] = await db.query(
    'SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1',
    [dbName.name, table, column],
  );
  return rows.length > 0;
}

async function seedCategories() {
  for (const item of categories) {
    await db.query(
      `INSERT INTO categories (id, name, icon, icon_url, sort_order, is_active, is_visible)
       VALUES (?, ?, ?, ?, ?, 1, 1)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         icon = VALUES(icon),
         icon_url = VALUES(icon_url),
         sort_order = VALUES(sort_order),
         is_active = 1,
         is_visible = 1,
         deleted_at = NULL`,
      [item.id, item.name, item.icon, item.icon, item.sort],
    );
  }
  return categories.length;
}

async function seedProducts() {
  const hasImageAlts = await columnExists('products', 'image_alts');
  const hasCoverAlt = await columnExists('products', 'cover_image_alt');
  const products = makeProducts();

  for (const item of products) {
    const columns = [
      'id', 'name', 'cover_image', 'images', 'price', 'original_price', 'points',
      'category_id', 'stock', 'status', 'lifecycle_status', 'sort_order',
      'description', 'is_recommended', 'is_new', 'is_hot', 'sales_count',
    ];
    const values = [
      item.id, item.name, item.cover, JSON.stringify(item.imageList), item.price,
      item.originalPrice, item.points, item.categoryId, item.stock, 'active', 1,
      item.sort, item.description, item.recommended, item.isNew, item.hot, item.sales,
    ];
    if (hasCoverAlt) {
      columns.push('cover_image_alt');
      values.push(`${item.name} cover image`);
    }
    if (hasImageAlts) {
      columns.push('image_alts');
      values.push(JSON.stringify(item.imageList.map((_, index) => `${item.name} gallery ${index + 1}`)));
    }
    const placeholders = columns.map(() => '?').join(', ');
    const updates = columns
      .filter((column) => column !== 'id')
      .map((column) => `${column} = VALUES(${column})`)
      .join(', ');
    await db.query(
      `INSERT INTO products (${columns.join(', ')})
       VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates}, deleted_at = NULL`,
      values,
    );
  }
  return products.length;
}

async function seedBanners() {
  const hasDescription = await columnExists('banners', 'description');
  for (const item of banners) {
    const columns = ['id', 'title', 'image', 'link', 'sort_order', 'enabled', 'publish_status', 'last_modified_at'];
    const values = [item.id, item.title, item.image, item.link, item.sort, 1, 'published', new Date()];
    if (hasDescription) {
      columns.push('description');
      values.push(item.description || 'Local preview banner for visual layout checks.');
    }
    const updates = columns
      .filter((column) => column !== 'id')
      .map((column) => `${column} = VALUES(${column})`)
      .join(', ');
    await db.query(
      `INSERT INTO banners (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE ${updates}, deleted_at = NULL`,
      values,
    );
  }
  return banners.length;
}

async function seedHomeNav() {
  if (!(await tableExists('home_nav_items'))) return 0;
  const [[existingNav]] = await db.query(
    'SELECT COUNT(*) AS count FROM home_nav_items WHERE id NOT LIKE ? AND enabled = 1',
    [`${PREFIX}-nav-%`],
  );
  if (Number(existingNav?.count || 0) > 0) {
    await db.query('UPDATE home_nav_items SET enabled = 0 WHERE id LIKE ?', [`${PREFIX}-nav-%`]);
    return 0;
  }
  for (const item of navItems) {
    await db.query(
      `INSERT INTO home_nav_items (
         id, icon_url, title, link_url, target_type, target_category_id,
         target_support_channel_id, sort_order, enabled
       ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 1)
       ON DUPLICATE KEY UPDATE
         icon_url = VALUES(icon_url),
         title = VALUES(title),
         link_url = VALUES(link_url),
         target_type = VALUES(target_type),
         target_category_id = VALUES(target_category_id),
         sort_order = VALUES(sort_order),
         enabled = 1,
         updated_at = NOW()`,
      [item.id, item.icon, item.title, item.link, item.target, item.category || null, item.sort],
    );
  }
  return navItems.length;
}

async function seedCoupons() {
  if (!(await tableExists('coupons'))) return 0;
  const coupons = [
    { id: `${PREFIX}-coupon-01`, code: 'PREVIEW10', title: 'Preview RM10 off', type: 'amount', value: 10, min: 99 },
    { id: `${PREFIX}-coupon-02`, code: 'PREVIEW20', title: 'Preview RM20 off', type: 'amount', value: 20, min: 199 },
    { id: `${PREFIX}-coupon-03`, code: 'PREVIEW8PCT', title: 'Preview 8 percent off', type: 'percent', value: 8, min: 129 },
    { id: `${PREFIX}-coupon-04`, code: 'PREVIEWVIP', title: 'Preview member deal', type: 'amount', value: 35, min: 299 },
  ];
  for (const item of coupons) {
    await db.query(
      `INSERT INTO coupons (
         id, code, title, type, value, min_amount, start_date, end_date,
         description, total_quantity, per_user_limit, status, publish_status
       ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 180 DAY), ?, 500, 1, 'available', 'active')
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         type = VALUES(type),
         value = VALUES(value),
         min_amount = VALUES(min_amount),
         description = VALUES(description),
         status = 'available',
         publish_status = 'active',
         deleted_at = NULL`,
      [item.id, item.code, item.title, item.type, item.value, item.min, 'Local preview coupon for coupon-card layout checks.'],
    );
  }
  return coupons.length;
}

async function seedMarketingActivities() {
  if (!(await tableExists('marketing_activities'))) return 0;
  const activities = [
    { id: `${PREFIX}-activity-01`, type: 'flash_sale', title: 'Preview Flash Sale', image: images[0], sort: 1 },
    { id: `${PREFIX}-activity-02`, type: 'full_reduction', title: 'Preview Bundle Deal', image: images[2], sort: 2 },
  ];
  for (const item of activities) {
    await db.query(
      `INSERT INTO marketing_activities (
         id, type, title, subtitle, cover_image, display_positions, description,
         scope_type, activity_config, start_at, end_at, status, disabled, sort_order
       ) VALUES (?, ?, ?, 'Local preview campaign', ?, JSON_ARRAY('home'), 'Local preview activity for homepage layout checks.',
         'product', JSON_OBJECT(), NOW(), DATE_ADD(NOW(), INTERVAL 180 DAY), 'active', 0, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         subtitle = VALUES(subtitle),
         cover_image = VALUES(cover_image),
         display_positions = VALUES(display_positions),
         description = VALUES(description),
         status = 'active',
         disabled = 0,
         sort_order = VALUES(sort_order),
         deleted_at = NULL`,
      [item.id, item.type, item.title, item.image, item.sort],
    );
  }
  return activities.length;
}

async function upsertSetting(key, value) {
  await db.query(
    `INSERT INTO site_settings (setting_key, setting_value, updated_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
    [key, typeof value === 'string' ? value : JSON.stringify(value)],
  );
}

async function seedSettings() {
  await upsertSetting('siteName', 'Local Preview Shop');
  await upsertSetting('announcement', 'Local preview data is enabled. Do not use this environment for real orders.');
  await upsertSetting('privacyPolicyPath', '/content/privacy-policy');
  await upsertSetting('termsPath', '/content/terms-of-service');
  await upsertSetting('refundPolicyPath', '/content/refund-policy');
  await upsertSetting('shippingPolicyPath', '/content/shipping-policy');
  return 6;
}

async function summarize() {
  const tables = ['categories', 'products', 'banners', 'home_nav_items', 'coupons', 'marketing_activities', 'content_pages'];
  const counts = {};
  for (const table of tables) {
    if (!(await tableExists(table))) {
      counts[table] = 'missing';
      continue;
    }
    const [[row]] = await db.query(`SELECT COUNT(*) AS total FROM ${table}`);
    counts[table] = Number(row.total || 0);
  }
  return counts;
}

async function main() {
  assertLocalOnly();
  const [[dbName]] = await db.query('SELECT DATABASE() AS name');
  const result = {
    database: dbName.name,
    categories: await seedCategories(),
    products: await seedProducts(),
    banners: await seedBanners(),
    homeNavItems: await seedHomeNav(),
    coupons: await seedCoupons(),
    marketingActivities: await seedMarketingActivities(),
    settings: await seedSettings(),
  };
  result.counts = await summarize();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error('[seed-preview-layout] failed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end().catch(() => {});
  });
