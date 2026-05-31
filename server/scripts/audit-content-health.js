/**
 * 内容健康检查：只读扫描后台已发布内容，不修改数据库。
 *
 * 用法：
 *   node scripts/audit-content-health.js
 *   node scripts/audit-content-health.js --strict
 *
 * 默认只输出问题，不让流程失败；加 --strict 后，发现 P0/P1 会以非 0 退出，
 * 适合上线前人工确认。
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../src/config/db');
const { ACTIVE_PRODUCT_WHERE } = require('../src/modules/product/productLifecycle');

const strict = process.argv.includes('--strict');

function stripHtml(input) {
  return String(input || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function textLength(input) {
  return stripHtml(input).length;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function nonEmptyCount(items) {
  return items.filter((item) => String(item || '').trim()).length;
}

function issue(level, area, location, problem, fix) {
  return { level, area, location, problem, fix };
}

function pushIf(list, condition, item) {
  if (condition) list.push(item);
}

async function auditCategories(issues) {
  const [rows] = await db.query(`
    SELECT
      c.id,
      c.name,
      c.description,
      c.buying_guide,
      c.faq_json,
      c.seo_title,
      c.seo_description,
      (
        SELECT COUNT(*)
        FROM products p
        WHERE p.category_id = c.id AND p.deleted_at IS NULL
      ) AS product_count
    FROM categories c
    WHERE c.deleted_at IS NULL
      AND c.is_active = 1
      AND c.is_visible = 1
    ORDER BY c.sort_order ASC, c.name ASC
  `);

  pushIf(
    issues,
    rows.length === 0,
    issue('P0', '分类页', '全部分类', '没有任何可见分类，前台分类页会变成空页面。', '至少保留一个真实业务分类，并补充分类简介。'),
  );

  for (const row of rows) {
    const name = row.name || row.id;
    const faq = parseJsonArray(row.faq_json);
    pushIf(
      issues,
      textLength(row.description) < 40,
      issue('P1', '分类页', name, '分类简介过短或缺失，分类页容易变成薄内容。', '补充适合谁、主要商品/服务、咨询或购买前注意事项，建议 80-160 字。'),
    );
    pushIf(
      issues,
      textLength(row.buying_guide) < 40,
      issue('P2', '分类页', name, '选购/咨询说明偏短，用户不知道如何判断是否适合自己。', '补充选购标准、服务边界、下单前需要确认的信息。'),
    );
    pushIf(
      issues,
      faq.length < 2,
      issue('P1', '分类页', name, '分类 FAQ 不足，Google 和 AI 搜索不容易理解真实用户问题。', '至少补 2 个真实 FAQ，例如是否保证结果、资料不齐怎么办、如何联系客服。'),
    );
    pushIf(
      issues,
      !String(row.seo_title || '').trim(),
      issue('P1', '分类页 SEO', name, '分类 SEO title 缺失。', `建议填写「${name}｜大马通」。`),
    );
    pushIf(
      issues,
      textLength(row.seo_description) < 50,
      issue('P1', '分类页 SEO', name, '分类 meta description 缺失或过短。', '写清楚分类卖什么、适合谁、如何咨询，建议 80-150 字。'),
    );
  }
}

async function auditProducts(issues) {
  const [rows] = await db.query(`
    SELECT id, name, description, cover_image, cover_image_alt, images, image_alt_json
    FROM products
    WHERE ${ACTIVE_PRODUCT_WHERE}
    ORDER BY created_at DESC
    LIMIT 1000
  `);

  pushIf(
    issues,
    rows.length === 0,
    issue('P0', '商品页', '全部商品', '没有任何上架商品，商城前台无法形成有效购买路径。', '确认至少有真实上架商品或服务项目。'),
  );

  for (const row of rows) {
    const name = row.name || row.id;
    const descText = stripHtml(row.description);
    const images = parseJsonArray(row.images);
    const alts = parseJsonArray(row.image_alt_json);
    pushIf(
      issues,
      !descText || descText === '暂无详情描述',
      issue('P1', '商品详情', name, '详情描述缺失，用户无法判断是否值得购买或咨询。', '补充服务内容/商品特点、适合人群、注意事项、售后边界。'),
    );
    pushIf(
      issues,
      descText && descText.length < 80,
      issue('P2', '商品详情', name, '详情描述偏短，转化和 SEO 都会受影响。', '扩展到至少 120 字，说明用途、规格/资料、流程、风险边界。'),
    );
    pushIf(
      issues,
      row.cover_image && !String(row.cover_image_alt || '').trim(),
      issue('P2', '图片 alt', name, '商品主图 alt 缺失。', `填写类似「${name} 主图」或更具体的图片说明。`),
    );
    pushIf(
      issues,
      images.length > 0 && nonEmptyCount(alts) < images.length,
      issue('P2', '图片 alt', name, '商品详情图 alt 没有逐张补齐。', '在后台为每张详情图填写真实说明，或使用自动兜底并逐步人工完善重点商品。'),
    );
  }
}

async function auditBanners(issues) {
  const [rows] = await db.query(`
    SELECT id, title, description, image
    FROM banners
    WHERE deleted_at IS NULL AND enabled = 1
    ORDER BY sort_order ASC
  `);

  for (const row of rows) {
    const label = row.title || row.id;
    pushIf(
      issues,
      !String(row.title || '').trim(),
      issue('P1', '首页轮播', label, '轮播标题为空，前台只能依赖代码兜底，不利于后台维护和图片可读性。', '填写真实标题，说明这张图主推的业务或活动。'),
    );
    pushIf(
      issues,
      textLength(row.description) < 20,
      issue('P2', '首页轮播', label, '轮播说明偏短或缺失。', '补一句真实说明，用于后台识别和图片 alt 补充。'),
    );
  }
}

async function auditContentPages(issues) {
  const [rows] = await db.query(`
    SELECT slug, title, body, publish_status
    FROM content_pages
    WHERE deleted_at IS NULL AND publish_status = 'published'
    ORDER BY slug ASC
  `);
  const required = new Map([
    ['about', { title: '关于我们', min: 180 }],
    ['contact-us', { title: '联系我们', min: 120 }],
    ['shipping-policy', { title: '配送政策', min: 220 }],
    ['refund-policy', { title: '退款政策', min: 260 }],
    ['privacy-policy', { title: '隐私政策', min: 260 }],
    ['terms-of-service', { title: '服务条款', min: 260 }],
  ]);
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  for (const [slug, meta] of required.entries()) {
    const row = bySlug.get(slug);
    pushIf(
      issues,
      !row,
      issue('P1', '内容页', slug, `${meta.title} 页面缺失或未发布。`, `在内容管理发布 slug=${slug} 的页面。`),
    );
    if (!row) continue;
    const len = textLength(row.body);
    pushIf(
      issues,
      len < meta.min,
      issue('P1', '内容页', row.title || slug, `${meta.title} 内容偏短，用户信任和 SEO 信息不足。`, '补充适用范围、处理流程、时间说明、例外情况和联系客服方式。'),
    );
    pushIf(
      issues,
      /待补充|暂无|请填写|lorem/i.test(stripHtml(row.body)),
      issue('P0', '内容页', row.title || slug, `${meta.title} 仍包含占位内容。`, '删除占位句，改成真实业务说明。'),
    );
  }
}

async function auditSiteSettings(issues) {
  const keys = [
    'siteName',
    'siteDescription',
    'seoTitle',
    'seoDescription',
    'supportText',
    'shippingNotice',
    'paymentNotice',
  ];
  const [rows] = await db.query(
    `SELECT setting_key, setting_value
     FROM site_settings
     WHERE setting_key IN (${keys.map(() => '?').join(',')})`,
    keys,
  );
  const settings = new Map(rows.map((row) => [row.setting_key, String(row.setting_value || '').trim()]));

  pushIf(
    issues,
    !settings.get('siteName'),
    issue('P1', '站点基础信息', 'siteName', '站点名称缺失，SEO title 和品牌识别会不稳定。', '在站点设置填写真实品牌名。'),
  );
  pushIf(
    issues,
    textLength(settings.get('siteDescription')) < 40,
    issue('P1', '站点基础信息', 'siteDescription', '站点描述过短，首页和 SEO 兜底信息不足。', '用 60-120 字说明网站卖什么、服务谁、如何联系客服。'),
  );
  pushIf(
    issues,
    textLength(settings.get('seoDescription')) < 50,
    issue('P1', '站点 SEO', 'seoDescription', '全站 SEO description 兜底过短。', '写清楚主营业务、服务地区、目标用户和客服支持。'),
  );
  for (const key of ['supportText', 'shippingNotice', 'paymentNotice']) {
    pushIf(
      issues,
      textLength(settings.get(key)) < 20,
      issue('P2', '购物信任文案', key, `${key} 偏短或缺失。`, '补充真实的客服、配送或付款说明，作为购物流程中的信任提示。'),
    );
  }
}

function printReport(issues) {
  const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const sorted = issues.sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));
  const counts = sorted.reduce((acc, item) => {
    acc[item.level] = (acc[item.level] || 0) + 1;
    return acc;
  }, {});

  console.log('内容健康检查完成');
  console.log(`总问题: ${sorted.length}，P0=${counts.P0 || 0}，P1=${counts.P1 || 0}，P2=${counts.P2 || 0}`);
  if (!sorted.length) {
    console.log('未发现明显内容健康问题。');
    return;
  }
  for (const item of sorted) {
    console.log('');
    console.log(`【${item.level}】${item.area}｜${item.location}`);
    console.log(`问题：${item.problem}`);
    console.log(`修复：${item.fix}`);
  }
}

(async () => {
  const issues = [];
  await auditCategories(issues);
  await auditProducts(issues);
  await auditBanners(issues);
  await auditContentPages(issues);
  await auditSiteSettings(issues);
  printReport(issues);

  const hasBlocking = issues.some((item) => item.level === 'P0' || item.level === 'P1');
  await db.end();
  process.exit(strict && hasBlocking ? 1 : 0);
})().catch(async (err) => {
  console.error('[content:audit] failed:', err);
  try {
    await db.end();
  } catch {}
  process.exit(1);
});
