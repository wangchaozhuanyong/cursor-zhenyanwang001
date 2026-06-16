/**
 * Seed V10 storefront smoke data into a safe test database only.
 *
 * Usage from server/:
 *   V10_SMOKE_USER_PHONE=15111122221 V10_SMOKE_USER_PASSWORD='...' node scripts/seed-v10-smoke-commerce.js
 */
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

const db = require('../src/config/db');

const PREFIX = 'v10-smoke';
const USER_ID = `${PREFIX}-user`;
const MEMBER_LEVEL_ID = `${PREFIX}-member-level`;
const CATEGORY_ID = `${PREFIX}-cat`;
const COUPON_ID = `${PREFIX}-coupon-20`;
const USER_COUPON_ID = `${PREFIX}-user-coupon-20`;
const SHIPPING_TEMPLATE_ID = `${PREFIX}-shipping-west`;

const phone = String(process.env.V10_SMOKE_USER_PHONE || '').trim();
const password = String(process.env.V10_SMOKE_USER_PASSWORD || '');
let smokeUserId = USER_ID;

function assertSafeTestDatabase() {
  const dbName = String(process.env.DB_NAME || '').trim();
  const nodeEnv = String(process.env.NODE_ENV || '').trim();
  if (nodeEnv !== 'test') {
    throw new Error(`Refusing to seed unless NODE_ENV=test. Current NODE_ENV=${nodeEnv || '(empty)'}`);
  }
  if (!/(test|ci|dev|staging)/i.test(dbName) && process.env.ALLOW_PRODUCTION_DB_TESTS !== '1') {
    throw new Error(`Refusing to seed non-test database: ${dbName || '(empty)'}`);
  }
  if (!phone) throw new Error('V10_SMOKE_USER_PHONE is required');
  if (!password) throw new Error('V10_SMOKE_USER_PASSWORD is required');
}

function mysqlDate(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function mysqlDay(date) {
  return date.toISOString().slice(0, 10);
}

function json(value) {
  return JSON.stringify(value);
}

function activityId(suffix) {
  return `${PREFIX}-${suffix}`;
}

const now = new Date();
const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

const products = [
  {
    id: `${PREFIX}-product-flash`,
    variantId: `${PREFIX}-variant-flash`,
    name: 'V10 Smoke Flash Deal',
    price: 120,
    originalPrice: 158,
    activityPrice: 69,
    points: 12,
    stock: 120,
    activityStock: 50,
    soldCount: 12,
    sort: -900,
    image: '/assets/home-banners/home-hero-03-local-goods-bg-mobile.webp',
  },
  {
    id: `${PREFIX}-product-limited`,
    variantId: `${PREFIX}-variant-limited`,
    name: 'V10 Smoke Limited Discount',
    price: 88,
    originalPrice: 108,
    activityPrice: 55,
    points: 8,
    stock: 140,
    activityStock: 80,
    soldCount: 21,
    sort: -899,
    image: '/assets/home-banners/home-hero-01-platform-bg-mobile.webp',
  },
  {
    id: `${PREFIX}-product-member`,
    variantId: `${PREFIX}-variant-member`,
    name: 'V10 Smoke Member Exclusive',
    price: 138,
    originalPrice: 168,
    activityPrice: 118,
    points: 16,
    stock: 90,
    activityStock: 60,
    soldCount: 7,
    sort: -898,
    image: '/assets/home-banners/home-hero-05-support-bg-mobile.webp',
  },
  {
    id: `${PREFIX}-product-bundle`,
    variantId: `${PREFIX}-variant-bundle`,
    name: 'V10 Smoke Bundle Product',
    price: 96,
    originalPrice: 128,
    activityPrice: null,
    points: 10,
    stock: 160,
    activityStock: 0,
    soldCount: 0,
    sort: -897,
    image: '/assets/home-banners/home-hero-02-visa-study-bg-mobile.webp',
  },
];

const activities = [
  {
    id: activityId('flash-sale'),
    slug: activityId('flash-sale'),
    type: 'flash_sale',
    title: 'V10 秒杀测试活动',
    subtitle: '活动价、倒计时、库存进度、限购联调',
    description: '用于验证 V10 活动中心、商品卡、结算和下单的秒杀闭环。',
    scopeType: 'product',
    positions: ['promotions', 'home_promotions', 'home_flash_sale'],
    ruleConfig: {
      limit_per_user: 2,
      countdown: true,
      stock_progress: true,
      badge: '秒杀',
    },
    stackable: false,
    exclusiveWith: ['coupon'],
    priority: 100,
    productIds: [products[0].id],
  },
  {
    id: activityId('limited-discount'),
    slug: activityId('limited-discount'),
    type: 'limited_time_discount',
    title: 'V10 限时折扣测试',
    subtitle: '活动价、时间窗口和商品范围联调',
    description: '用于验证限时折扣在活动详情、商品详情和列表中的后端返回字段。',
    scopeType: 'product',
    positions: ['promotions', 'home_promotions'],
    ruleConfig: {
      discount_percent: 62.5,
      badge: '限时折扣',
    },
    stackable: true,
    exclusiveWith: [],
    priority: 90,
    productIds: [products[1].id],
  },
  {
    id: activityId('full-reduction'),
    slug: activityId('full-reduction'),
    type: 'full_reduction',
    title: 'V10 满减测试',
    subtitle: '满 RM100 减 RM15，满 RM200 减 RM35',
    description: '用于验证购物车满减差额、结算优惠明细和订单快照。',
    scopeType: 'all',
    positions: ['promotions', 'home_promotions', 'full_reduction_notice'],
    thresholdAmount: 100,
    discountAmount: 15,
    ruleConfig: {
      full_reduction_rules: [
        { threshold_amount: 100, discount_amount: 15 },
        { threshold_amount: 200, discount_amount: 35 },
      ],
      badge: '满减',
    },
    stackable: true,
    exclusiveWith: [],
    priority: 80,
    productIds: [],
  },
  {
    id: activityId('full-discount'),
    slug: activityId('full-discount'),
    type: 'full_discount',
    title: 'V10 满折测试',
    subtitle: '满 RM180 打 9 折',
    description: '用于验证满折规则在规则引擎和前端说明里的展示。',
    scopeType: 'all',
    positions: ['promotions', 'home_promotions', 'full_reduction_notice'],
    ruleConfig: {
      full_discount_rules: [{ threshold_amount: 180, discount_percent: 90 }],
      badge: '满折',
    },
    stackable: false,
    exclusiveWith: ['full_reduction'],
    priority: 70,
    productIds: [],
  },
  {
    id: activityId('member-price'),
    slug: activityId('member-price'),
    type: 'member_price',
    title: 'V10 会员专享测试',
    subtitle: '测试会员价规则和会员专属入口',
    description: '用于验证会员专享活动卡、活动详情和结算会员价折扣。',
    scopeType: 'product',
    positions: ['promotions', 'home_promotions'],
    ruleConfig: {
      member_price_rules: [
        { member_level_ids: [MEMBER_LEVEL_ID], discount_percent: 85, min_order_amount: 0 },
      ],
      badge: '会员价',
    },
    stackable: true,
    exclusiveWith: [],
    priority: 60,
    productIds: [products[2].id],
  },
  {
    id: activityId('coupon'),
    slug: activityId('coupon'),
    type: 'coupon',
    title: 'V10 优惠券测试',
    subtitle: 'RM80 可用券，领券中心、可用原因、不可用原因联调',
    description: '用于验证活动详情领券 CTA 和结算页优惠券明细。',
    scopeType: 'all',
    positions: ['promotions', 'home_promotions', 'home_coupon_center', 'coupon_center'],
    ruleConfig: {
      coupon_ids: [COUPON_ID],
      badge: '领券',
    },
    stackable: true,
    exclusiveWith: [],
    priority: 50,
    productIds: [],
  },
  {
    id: activityId('checkin-reward'),
    slug: activityId('checkin-reward'),
    type: 'checkin_reward',
    title: 'V10 签到奖励测试',
    subtitle: '每日签到奖励 20 积分',
    description: '用于验证积分/签到活动入口和规则说明。',
    scopeType: 'all',
    positions: ['promotions', 'home_promotions'],
    ruleConfig: {
      reward_points: 20,
      once_per_day: true,
      streak_bonus_points: 50,
      streak_bonus_every_days: 7,
      badge: '签到',
    },
    stackable: true,
    exclusiveWith: [],
    priority: 40,
    productIds: [],
  },
  {
    id: activityId('points-reward'),
    slug: activityId('points-reward'),
    type: 'points_reward',
    title: 'V10 积分奖励测试',
    subtitle: '订单满额额外送积分',
    description: '用于验证积分奖励活动入口和结算奖励明细。',
    scopeType: 'all',
    positions: ['promotions', 'home_promotions'],
    ruleConfig: {
      points_reward_rules: [
        { min_order_amount: 100, reward_points: 30 },
        { min_order_amount: 200, reward_points: 80 },
      ],
      badge: '积分奖励',
    },
    stackable: true,
    exclusiveWith: [],
    priority: 30,
    productIds: [],
  },
];

async function upsertMemberLevel(conn) {
  await conn.query(
    `INSERT INTO member_levels
       (id, name, description, min_spent, min_orders, discount_rate, points_multiplier,
        free_shipping_enabled, sort_order, enabled, is_default)
     VALUES (?, ?, ?, 0, 0, 1.00, 1.20, 0, -900, 1, 0)
     ON DUPLICATE KEY UPDATE
       description = VALUES(description),
       points_multiplier = VALUES(points_multiplier),
       enabled = 1,
       is_default = 0,
       updated_at = CURRENT_TIMESTAMP`,
    [MEMBER_LEVEL_ID, 'V10 Smoke Gold', 'V10 smoke test member level'],
  );
}

async function upsertUser(conn) {
  const hash = await bcrypt.hash(password, 10);
  const [[existing]] = await conn.query(
    'SELECT id FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1',
    [phone],
  );
  smokeUserId = existing?.id || USER_ID;

  if (existing?.id) {
    await conn.query(
      `UPDATE users
          SET password_hash = ?,
              nickname = ?,
              points_balance = 12000,
              member_level_id = ?,
              role = 'user',
              account_status = 'normal',
              deleted_at = NULL
        WHERE id = ?`,
      [hash, 'V10 测试用户', MEMBER_LEVEL_ID, smokeUserId],
    );
    return;
  }

  await conn.query(
    `INSERT INTO users
       (id, phone, password_hash, nickname, invite_code, parent_invite_code,
        points_balance, member_level_id, role, account_status, email)
     VALUES (?, ?, ?, ?, ?, '', 12000, ?, 'user', 'normal', '')`,
    [smokeUserId, phone, hash, 'V10 测试用户', 'V10SMOKE', MEMBER_LEVEL_ID],
  );
}

async function upsertCategory(conn) {
  await conn.query(
    `INSERT INTO categories
       (id, name, description, icon, icon_url, sort_order, is_active, is_visible, deleted_at)
     VALUES (?, 'V10 Smoke 活动测试', 'V10 smoke category', 'tag', 'tag', -900, 1, 1, NULL)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       description = VALUES(description),
       sort_order = VALUES(sort_order),
       is_active = 1,
       is_visible = 1,
       deleted_at = NULL`,
    [CATEGORY_ID],
  );
}

async function upsertProducts(conn) {
  for (const item of products) {
    const gallery = [item.image];
    await conn.query(
      `INSERT INTO products
         (id, name, cover_image, cover_image_alt, images, image_alt_json, price,
          original_price, points, category_id, stock, stock_warning_threshold,
          status, lifecycle_status, sort_order, description, is_recommended,
          is_new, is_hot, sales_count, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5, 'active', 1, ?, ?, 1, 1, 1, ?, NULL)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         cover_image = VALUES(cover_image),
         cover_image_alt = VALUES(cover_image_alt),
         images = VALUES(images),
         image_alt_json = VALUES(image_alt_json),
         price = VALUES(price),
         original_price = VALUES(original_price),
         points = VALUES(points),
         category_id = VALUES(category_id),
         stock = VALUES(stock),
         status = 'active',
         lifecycle_status = 1,
         sort_order = VALUES(sort_order),
         description = VALUES(description),
         is_recommended = 1,
         is_new = 1,
         is_hot = 1,
         sales_count = VALUES(sales_count),
         deleted_at = NULL`,
      [
        item.id,
        item.name,
        item.image,
        `${item.name} cover`,
        json(gallery),
        json([`${item.name} cover`]),
        item.price,
        item.originalPrice,
        item.points,
        CATEGORY_ID,
        item.stock,
        item.sort,
        `${item.name} is generated only for V10 smoke tests.`,
        item.soldCount,
      ],
    );

    await conn.query(
      `INSERT INTO product_variants
         (id, product_id, sku_code, title, price, original_price, stock,
          stock_warning_threshold, unit_name, reserved_stock, cost_price,
          image_url, weight, enabled, deleted_at, sort_order, is_default)
       VALUES (?, ?, ?, 'Default', ?, ?, ?, 5, '件', 0, ?, ?, 0.500, 1, NULL, 1, 1)
       ON DUPLICATE KEY UPDATE
         sku_code = VALUES(sku_code),
         title = VALUES(title),
         price = VALUES(price),
         original_price = VALUES(original_price),
         stock = VALUES(stock),
         reserved_stock = 0,
         cost_price = VALUES(cost_price),
         image_url = VALUES(image_url),
         weight = VALUES(weight),
         enabled = 1,
         deleted_at = NULL,
         is_default = 1,
         updated_at = CURRENT_TIMESTAMP`,
      [
        item.variantId,
        item.id,
        item.id.replace(`${PREFIX}-product-`, 'V10-').toUpperCase(),
        item.price,
        item.originalPrice,
        item.stock,
        Math.max(1, Math.round(item.price * 0.55)),
        item.image,
      ],
    );
  }
}

async function upsertCoupon(conn) {
  await conn.query(
    `INSERT INTO coupons
       (id, code, title, type, value, min_amount, start_date, end_date, description,
        scope_type, display_badge, display_positions, audience_type, audience_config,
        total_quantity, per_user_limit, new_user_only, member_only, auto_issue,
        usable_scope_type, usable_product_ids, usable_category_ids, stackable_with_activity,
        status, publish_status, claim_start_at, claim_end_at, campaign_start_at,
        campaign_end_at, use_start_at, use_end_at, validity_mode, issue_mode,
        claimed_count, used_count, deleted_at)
     VALUES
       (?, 'V10SMOKE20', 'V10 Smoke RM20 Coupon', 'amount', 20, 80, ?, ?, ?,
        'all', 'RM20', ?, 'all', ?, 1000, 1, 0, 0, 0, 'all', ?, ?, 1,
        'available', 'active', ?, ?, ?, ?, ?, ?, 'absolute', 'manual',
        1, 0, NULL)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       value = VALUES(value),
       min_amount = VALUES(min_amount),
       start_date = VALUES(start_date),
       end_date = VALUES(end_date),
       description = VALUES(description),
       display_badge = VALUES(display_badge),
       display_positions = VALUES(display_positions),
       status = 'available',
       publish_status = 'active',
       claim_start_at = VALUES(claim_start_at),
       claim_end_at = VALUES(claim_end_at),
       campaign_start_at = VALUES(campaign_start_at),
       campaign_end_at = VALUES(campaign_end_at),
       use_start_at = VALUES(use_start_at),
       use_end_at = VALUES(use_end_at),
       stackable_with_activity = 1,
       claimed_count = 1,
       used_count = 0,
       deleted_at = NULL`,
    [
      COUPON_ID,
      mysqlDay(start),
      mysqlDay(end),
      'V10 smoke coupon for checkout preview and order amount checks.',
      json(['coupon_center', 'home_coupon_center', 'promotions']),
      json({ source: PREFIX }),
      json([]),
      json([]),
      mysqlDate(start),
      mysqlDate(end),
      mysqlDate(start),
      mysqlDate(end),
      mysqlDate(start),
      mysqlDate(end),
    ],
  );

  const snapshot = {
    id: COUPON_ID,
    code: 'V10SMOKE20',
    title: 'V10 Smoke RM20 Coupon',
    type: 'amount',
    value: 20,
    min_amount: 80,
    scope_type: 'all',
    usable_scope_type: 'all',
    usable_product_ids: [],
    usable_category_ids: [],
    stackable_with_activity: true,
  };
  await conn.query(
    `INSERT INTO user_coupons
       (id, user_id, coupon_id, coupon_snapshot, claimed_at, status, valid_from,
        valid_until, issue_channel, issue_activity_id, used_at, order_id,
        order_no, discount_amount, invalid_reason, returned_at, return_reason, locked_at)
     VALUES (?, ?, ?, ?, NOW(), 'available', ?, ?, 'smoke_seed', ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       coupon_id = VALUES(coupon_id),
       coupon_snapshot = VALUES(coupon_snapshot),
       status = 'available',
       valid_from = VALUES(valid_from),
       valid_until = VALUES(valid_until),
       issue_channel = VALUES(issue_channel),
       issue_activity_id = VALUES(issue_activity_id),
       used_at = NULL,
       order_id = NULL,
       order_no = NULL,
       discount_amount = NULL,
       invalid_reason = NULL,
       returned_at = NULL,
       return_reason = NULL,
       locked_at = NULL`,
    [USER_COUPON_ID, smokeUserId, COUPON_ID, json(snapshot), mysqlDate(start), mysqlDate(end), activityId('coupon')],
  );
}

async function upsertActivities(conn) {
  for (const item of activities) {
    await conn.query(
      `INSERT INTO marketing_activities
         (id, slug, type, title, subtitle, cover_image, display_positions,
          description, scope_type, allow_coupon_stack, allow_points_stack,
          allow_reward, activity_config, rule_config, stackable, exclusive_with,
          usage_limit_total, usage_limit_per_user, version, start_at, end_at,
          status, disabled, threshold_amount, discount_amount, sort_order,
          priority, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 10000, 5, 1, ?, ?,
          'active', 0, ?, ?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE
         slug = VALUES(slug),
         type = VALUES(type),
         title = VALUES(title),
         subtitle = VALUES(subtitle),
         cover_image = VALUES(cover_image),
         display_positions = VALUES(display_positions),
         description = VALUES(description),
         scope_type = VALUES(scope_type),
         allow_coupon_stack = VALUES(allow_coupon_stack),
         allow_points_stack = VALUES(allow_points_stack),
         allow_reward = VALUES(allow_reward),
         activity_config = VALUES(activity_config),
         rule_config = VALUES(rule_config),
         stackable = VALUES(stackable),
         exclusive_with = VALUES(exclusive_with),
         usage_limit_total = VALUES(usage_limit_total),
         usage_limit_per_user = VALUES(usage_limit_per_user),
         version = version + 1,
         start_at = VALUES(start_at),
         end_at = VALUES(end_at),
         status = 'active',
         disabled = 0,
         threshold_amount = VALUES(threshold_amount),
         discount_amount = VALUES(discount_amount),
         sort_order = VALUES(sort_order),
         priority = VALUES(priority),
         deleted_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [
        item.id,
        item.slug,
        item.type,
        item.title,
        item.subtitle,
        products[0].image,
        json(item.positions),
        item.description,
        item.scopeType,
        item.stackable ? 1 : 0,
        item.type === 'points_reward' || item.type === 'checkin_reward' ? 1 : 0,
        json({ ...item.ruleConfig, coupon_ids: item.id === activityId('coupon') ? [COUPON_ID] : undefined }),
        json({ ...item.ruleConfig, coupon_ids: item.id === activityId('coupon') ? [COUPON_ID] : undefined }),
        item.stackable ? 1 : 0,
        json(item.exclusiveWith),
        mysqlDate(start),
        mysqlDate(end),
        item.thresholdAmount ?? null,
        item.discountAmount ?? null,
        -item.priority,
        item.priority,
      ],
    );
  }

  await conn.query(
    `DELETE FROM marketing_activity_products
      WHERE activity_id LIKE ? OR product_id LIKE ?`,
    [`${PREFIX}-%`, `${PREFIX}-%`],
  );
  await conn.query(
    `DELETE FROM marketing_activity_scopes
      WHERE activity_id LIKE ?`,
    [`${PREFIX}-%`],
  );

  let relationIndex = 1;
  for (const activity of activities) {
    for (const productId of activity.productIds) {
      const product = products.find((item) => item.id === productId);
      await conn.query(
        `INSERT INTO marketing_activity_products
           (id, activity_id, product_id, activity_price, limit_per_user,
            activity_stock, sold_count, sort_order)
         VALUES (?, ?, ?, ?, 2, ?, ?, ?)`,
        [
          `${activity.id}-p${relationIndex}`,
          activity.id,
          product.id,
          product.activityPrice ?? product.price,
          product.activityStock,
          product.soldCount,
          relationIndex,
        ],
      );
      await conn.query(
        `INSERT INTO marketing_activity_scopes
           (id, activity_id, scope_type, scope_id)
         VALUES (?, ?, 'product', ?)`,
        [`${activity.id}-scope-${relationIndex}`, activity.id, product.id],
      );
      relationIndex += 1;
    }
  }
}

async function upsertShipping(conn) {
  await conn.query(
    `INSERT INTO shipping_templates
       (id, name, regions, country_code, region_group, state_codes, city_names,
        postcode_patterns, base_fee, free_above, extra_per_kg, min_weight_kg,
        max_weight_kg, min_order_amount, max_order_amount, rule_config, enabled,
        is_default)
     VALUES (?, 'V10 Smoke West Malaysia', 'West Malaysia', 'MY', 'west',
        ?, '', ?, 6.00, 300.00, 1.50, 0.000, 30.000, 0.00, NULL, ?, 1, 1)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       regions = VALUES(regions),
       country_code = VALUES(country_code),
       region_group = VALUES(region_group),
       state_codes = VALUES(state_codes),
       postcode_patterns = VALUES(postcode_patterns),
       base_fee = VALUES(base_fee),
       free_above = VALUES(free_above),
       extra_per_kg = VALUES(extra_per_kg),
       rule_config = VALUES(rule_config),
       enabled = 1,
       is_default = 1`,
    [
      SHIPPING_TEMPLATE_ID,
      json(['Selangor', 'Kuala Lumpur', 'Johor', 'Penang']),
      json(['4****', '5****', '8****', '1****']),
      json({ smoke: true, zones: ['west'] }),
    ],
  );
}

async function resetCart(conn) {
  await conn.query('DELETE FROM cart_items WHERE user_id = ?', [smokeUserId]);
  for (const [index, item] of [products[0], products[3]].entries()) {
    await conn.query(
      `INSERT INTO cart_items
         (id, user_id, product_id, variant_id, sku_code, qty)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        `${PREFIX}-cart-${index + 1}`,
        smokeUserId,
        item.id,
        item.variantId,
        item.id.replace(`${PREFIX}-product-`, 'V10-').toUpperCase(),
        index === 0 ? 1 : 2,
      ],
    );
  }
}

async function main() {
  assertSafeTestDatabase();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await upsertMemberLevel(conn);
    await upsertUser(conn);
    await upsertCategory(conn);
    await upsertProducts(conn);
    await upsertCoupon(conn);
    await upsertActivities(conn);
    await upsertShipping(conn);
    await resetCart(conn);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await db.end().catch(() => {});
  }

  console.log(JSON.stringify({
    ok: true,
    database: process.env.DB_NAME,
    user_id: smokeUserId,
    phone,
    category_id: CATEGORY_ID,
    product_ids: products.map((item) => item.id),
    promotion_slugs: activities.map((item) => item.slug),
    coupon_user_coupon_id: USER_COUPON_ID,
    shipping_template_id: SHIPPING_TEMPLATE_ID,
  }, null, 2));
}

main().catch((err) => {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});
