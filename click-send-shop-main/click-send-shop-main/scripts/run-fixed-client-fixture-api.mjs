import http from "node:http";
import { readFileSync } from "node:fs";

const PORT = Number(process.env.FIXTURE_API_PORT || 3199);
const HOST = "127.0.0.1";
const UPSTREAM_API = String(process.env.READONLY_UPSTREAM_API || "https://damatong.net/api").replace(/\/+$/, "");
const NOW = "2026-07-29T10:00:00.000Z";
const FIXTURE_MEDIA_ROOT = new URL("./fixtures/fixed-client-assets/", import.meta.url);
const fixtureMediaUrl = (name) => `/api/fixture-media/${name}`;
const productionRepairPlan = JSON.parse(
  readFileSync(new URL("../docs/production-content-repair-plan.json", import.meta.url), "utf8"),
);

const product = {
  id: "fixture-product-01",
  name: "城市精选生活礼盒",
  cover_image: fixtureMediaUrl("product-gift.webp"),
  images: [fixtureMediaUrl("product-gift.webp")],
  price: 89.9,
  effective_price: 89.9,
  original_price: 109.9,
  points: 90,
  category_id: "fixture-category",
  category_name: "礼物精选",
  stock: 28,
  status: "active",
  lifecycle_status: 1,
  sort_order: 1,
  description: "本地视觉验收商品，不会创建真实订单。",
  is_recommended: true,
  is_new: true,
  is_hot: true,
  sales_count: 326,
  variants: [],
};

const fixtureProducts = [
  product,
  {
    ...product,
    id: "fixture-product-02",
    name: "本地仓精选日用组合",
    cover_image: fixtureMediaUrl("product-towels.webp"),
    images: [fixtureMediaUrl("product-towels.webp")],
    price: 59.9,
    effective_price: 59.9,
    original_price: 79.9,
    points: 60,
    category_id: "fixture-category-home",
    category_name: "家居生活",
    stock: 42,
    sales_count: 218,
    is_new: false,
  },
  {
    ...product,
    id: "fixture-product-03",
    name: "城市会员专享护理套装",
    cover_image: fixtureMediaUrl("product-serum.webp"),
    images: [fixtureMediaUrl("product-serum.webp")],
    price: 128,
    effective_price: 108,
    activity_price: 108,
    original_price: 148,
    points: 108,
    category_id: "fixture-category-beauty",
    category_name: "个护美妆",
    stock: 16,
    sales_count: 126,
    is_hot: false,
  },
  {
    ...product,
    id: "fixture-product-04",
    name: "中国好物直送精选箱",
    cover_image: fixtureMediaUrl("product-coffee.webp"),
    images: [fixtureMediaUrl("product-coffee.webp")],
    price: 76.5,
    effective_price: 76.5,
    original_price: 96,
    points: 77,
    category_id: "fixture-category-food",
    category_name: "食品饮料",
    stock: 31,
    sales_count: 302,
    is_recommended: false,
  },
  {
    ...product,
    id: "fixture-product-05",
    name: "安心配送生活补给包",
    cover_image: fixtureMediaUrl("product-airfryer.webp"),
    images: [fixtureMediaUrl("product-airfryer.webp")],
    price: 39.9,
    effective_price: 39.9,
    original_price: 49.9,
    points: 40,
    category_id: "fixture-category-home",
    category_name: "家居生活",
    stock: 56,
    sales_count: 418,
    is_new: false,
  },
  {
    ...product,
    id: "fixture-product-06",
    name: "会员优惠券组合礼遇",
    cover_image: fixtureMediaUrl("product-snacks.webp"),
    images: [fixtureMediaUrl("product-snacks.webp")],
    price: 29.9,
    effective_price: 29.9,
    original_price: 39.9,
    points: 30,
    category_id: "fixture-category-gift",
    category_name: "礼物精选",
    stock: 68,
    sales_count: 512,
    is_hot: false,
  },
  {
    ...product,
    id: "fixture-product-07",
    name: "中文客服生活服务包",
    cover_image: fixtureMediaUrl("product-diffuser.webp"),
    images: [fixtureMediaUrl("product-diffuser.webp")],
    price: 19.9,
    effective_price: 19.9,
    original_price: null,
    points: 20,
    category_id: "fixture-category-service",
    category_name: "城市服务",
    stock: 99,
    sales_count: 186,
    is_new: false,
    is_recommended: false,
  },
];

const fixtureCategories = [
  {
    id: "fixture-category-gift",
    name: "礼物精选",
    description: "节庆、探访与日常心意精选",
    banner_image_url: "/assets/fixed-storefront/category-gift-hero.webp",
    banner_title: "礼物精选",
    banner_subtitle: "得体心意，轻松送达",
    banner_enabled: true,
    sort_order: 1,
    parent_id: null,
    is_active: true,
    is_visible: true,
    productCount: 2,
    children: [],
  },
  {
    id: "fixture-category-home",
    name: "家居生活",
    description: "日用、收纳与居家补给",
    banner_image_url: "/assets/fixed-storefront/category-home-hero.webp",
    banner_title: "家居生活",
    banner_subtitle: "把日常过得更从容",
    banner_enabled: true,
    sort_order: 2,
    parent_id: null,
    is_active: true,
    is_visible: true,
    productCount: 2,
    children: [],
  },
  {
    id: "fixture-category-food",
    name: "食品饮料",
    description: "日常风味与安心补给",
    banner_image_url: "/assets/fixed-storefront/category-food-hero.webp",
    banner_title: "食品饮料",
    banner_subtitle: "城市里的熟悉味道",
    banner_enabled: true,
    sort_order: 3,
    parent_id: null,
    is_active: true,
    is_visible: true,
    productCount: 1,
    children: [],
  },
  {
    id: "fixture-category-beauty",
    name: "个护美妆",
    description: "温和护理与日常焕新",
    banner_image_url: "/assets/fixed-storefront/category-beauty-hero.webp",
    banner_title: "个护美妆",
    banner_subtitle: "日常护理，清爽有度",
    banner_enabled: true,
    sort_order: 4,
    parent_id: null,
    is_active: true,
    is_visible: true,
    productCount: 1,
    children: [],
  },
  {
    id: "fixture-category-service",
    name: "城市服务",
    description: "咨询、确认与本地生活协助",
    banner_image_url: "/assets/fixed-storefront/category-visa-hero.webp",
    banner_title: "城市服务",
    banner_subtitle: "常用服务，一站找到",
    banner_enabled: true,
    sort_order: 5,
    parent_id: null,
    is_active: true,
    is_visible: true,
    productCount: 1,
    children: [],
  },
];

const fixturePromotions = [
  {
    id: "fixture-promotion-flash",
    slug: "fixture-weekly-selection",
    type: "flash_sale",
    title: "本周城市精选",
    subtitle: "精选生活好物限时直降",
    description: "本地视觉验收活动，不会创建真实交易。",
    cover_image: "/assets/fixed-storefront/home-banner-05-local-stock-desktop.webp",
    promo_label: "最高省 RM 20",
    start_at: "2026-07-29T00:00:00.000Z",
    end_at: "2026-08-31T23:59:59.000Z",
    priority: 10,
    scope_type: "all",
    display_positions: ["promotion_center"],
    rule_config: null,
    stackable: false,
    exclusive_with: [],
    usage_limit_total: null,
    usage_limit_per_user: 2,
    version: 1,
    runtime_status: "active",
    countdown_seconds: 86400,
    starts_in_seconds: 0,
    href: "/promotions/fixture-weekly-selection",
    items: fixtureProducts.slice(0, 4).map((item, index) => ({
      product_id: item.id,
      product_name: item.name,
      cover_image: item.cover_image,
      product_price: Number(item.original_price || item.price),
      product_stock: item.stock,
      activity_price: item.price,
      activity_stock: item.stock,
      sold_count: item.sales_count || 0,
      remaining_stock: item.stock,
      limit_per_user: 2,
      stock_progress_percent: 45 + index * 8,
      sold_out: false,
      saving_amount: Math.max(0, Number(item.original_price || item.price) - Number(item.price)),
      saving_percent: 12 + index * 3,
    })),
  },
  {
    id: "fixture-promotion-member",
    slug: "fixture-member-benefits",
    type: "member_price",
    title: "会员生活礼遇",
    subtitle: "会员专享价格与积分奖励",
    description: "会员权益集中展示，结算结果仍以后端为准。",
    cover_image: "/assets/fixed-storefront/home-banner-02-membership-benefits-desktop.webp",
    promo_label: "会员专享",
    start_at: "2026-07-01T00:00:00.000Z",
    end_at: "2026-08-31T23:59:59.000Z",
    priority: 8,
    scope_type: "member_level",
    display_positions: ["promotion_center"],
    rule_config: null,
    stackable: true,
    exclusive_with: [],
    usage_limit_total: null,
    usage_limit_per_user: null,
    version: 1,
    runtime_status: "active",
    countdown_seconds: 172800,
    starts_in_seconds: 0,
    href: "/promotions/fixture-member-benefits",
    items: fixtureProducts.slice(2, 6).map((item) => ({
      product_id: item.id,
      product_name: item.name,
      cover_image: item.cover_image,
      product_price: Number(item.original_price || item.price),
      product_stock: item.stock,
      activity_price: Number(item.effective_price || item.price),
      activity_stock: item.stock,
      sold_count: item.sales_count || 0,
      remaining_stock: item.stock,
      limit_per_user: 3,
      stock_progress_percent: 52,
      sold_out: false,
      saving_amount: Math.max(0, Number(item.original_price || item.price) - Number(item.effective_price || item.price)),
      saving_percent: 15,
    })),
  },
];

const adminFixtureProducts = (
  productionRepairPlan?.details?.productsWithoutEffectiveImage || []
).map((item, index) => ({
  id: String(item.id || `fixture-missing-product-${index + 1}`),
  name: String(item.name || `待补图商品 ${index + 1}`),
  cover_image: "",
  effective_cover_image: "",
  images: [],
  price: 38 + (index % 6) * 7,
  points: 0,
  category_id: "fixture-restricted-category",
  category_name: index % 2 === 0 ? "正品烟草" : "正品酒水",
  stock: 20 + index,
  lifecycle_status: 1,
  status: "active",
  sort_order: index + 1,
  description: "本地后台缺图修复流程验收数据，不会写入生产商品。",
  is_recommended: true,
  is_new: index < 8,
  is_hot: true,
  is_age_restricted: true,
  minimum_age: 18,
  variants: [],
  spec_groups: [],
  spec_values: [],
  default_variant: null,
  sku_count: 1,
  enabled_sku_count: 1,
  min_sku_price: 38 + (index % 6) * 7,
  max_sku_price: 38 + (index % 6) * 7,
  min_cost_price: 0,
  max_cost_price: 0,
  missing_cost_sku_count: 0,
  stock_warning_sku_count: 0,
  out_of_stock_sku_count: 0,
  sales_qty_7d: 4 + (index % 5),
  sales_amount_7d: 120 + index * 3,
  sales_qty_30d: 18 + (index % 9),
  sales_amount_30d: 680 + index * 11,
  gross_profit_30d: 0,
  gross_margin_30d: null,
}));

const adminFixtureCategories = (
  productionRepairPlan?.details?.categoriesWithoutCustomBanner || []
).map((name, index) => ({
  id: `fixture-category-${index + 1}`,
  name: String(name),
  description: `${name}分类的本地后台主图审阅数据，不会写入生产配置。`,
  buying_guide: "",
  faq: [],
  seo_title: "",
  seo_description: "",
  icon: "",
  icon_url: "",
  banner_image_url: "",
  banner_title: "",
  banner_subtitle: "",
  banner_link: "",
  banner_enabled: false,
  parent_id: null,
  sort_order: index + 1,
  is_active: true,
  is_visible: true,
  productCount: index + 3,
  children: [],
}));

const adminFixtureBannerImages = [
  "/assets/fixed-storefront/home-banner-01-customer-support-desktop.webp",
  "/assets/fixed-storefront/home-banner-02-membership-benefits-desktop.webp",
  "/assets/fixed-storefront/home-banner-03-coupon-activity-desktop.webp",
  "/assets/fixed-storefront/home-banner-04-delivery-arrangement-desktop.webp",
  "/assets/fixed-storefront/home-banner-05-local-stock-desktop.webp",
  "/assets/fixed-storefront/home-banner-06-china-selection-desktop.webp",
  "/assets/fixed-storefront/home-banner-07-gift-selection-desktop.webp",
];

const adminFixtureBanners = (
  productionRepairPlan?.details?.bannerTitlesWithoutResponsiveMedia || []
).map((title, index) => ({
  id: `fixture-banner-${index + 1}`,
  title: String(title),
  description: "本地后台轮播双图修复流程验收数据，不会写入生产配置。",
  cta_text: "立即查看",
  link: "/categories",
  image: adminFixtureBannerImages[index] || adminFixtureBannerImages[0],
  image_mobile: "",
  image_desktop: "",
  sort_order: index + 1,
  enabled: true,
}));

const adminFixtureNavItems = [
  ...(productionRepairPlan?.details?.invalidHomeNavItems || []).map((item, index) => ({
    id: String(item.id),
    icon_url: "",
    title: String(item.title),
    link_url: item.reason === "missing_url" ? "" : String(item.suggestedLinkUrl || ""),
    target_type: item.suggestedAction === "set_category" ? "category" : "url",
    target_category_id: item.targetCategoryId || null,
    target_support_channel_id: null,
    sort_order: index + 1,
    enabled: true,
  })),
  ...(productionRepairPlan?.details?.externalHomeNavItems || []).map((item, index) => ({
    id: String(item.id),
    icon_url: "",
    title: String(item.title),
    link_url: String(item.linkUrl || ""),
    target_type: "url",
    target_category_id: null,
    target_support_channel_id: null,
    sort_order: 6 + index,
    enabled: true,
  })),
  {
    id: "fixture-nav-all",
    icon_url: "",
    title: "全部分类",
    link_url: "/categories",
    target_type: "categories",
    target_category_id: null,
    target_support_channel_id: null,
    sort_order: 7,
    enabled: true,
  },
  {
    id: "fixture-nav-cart",
    icon_url: "",
    title: "购物车",
    link_url: "/cart",
    target_type: "url",
    target_category_id: null,
    target_support_channel_id: null,
    sort_order: 8,
    enabled: true,
  },
  {
    id: "fixture-nav-promotions",
    icon_url: "",
    title: "优惠活动",
    link_url: "/promotions",
    target_type: "url",
    target_category_id: null,
    target_support_channel_id: null,
    sort_order: 9,
    enabled: true,
  },
  {
    id: "fixture-nav-support",
    icon_url: "",
    title: "客服帮助",
    link_url: "/support-download",
    target_type: "url",
    target_category_id: null,
    target_support_channel_id: null,
    sort_order: 10,
    enabled: true,
  },
];

const adminFixtureProfile = {
  id: "fixture-admin-01",
  username: "fixture-admin",
  role: "super_admin",
  permissions: [],
  isSuperAdmin: true,
  roleCodes: ["super_admin"],
};

const adminFixtureSettings = {
  siteName: "大马通",
  siteSlogan: "马来西亚华人生活服务与本地优选商城",
  siteDescription: "本地固定客户端与后台验收环境",
  currency: "MYR",
  complianceNotice: "受限商品仅面向已达到当地法定年龄的用户。",
  ageGateEnabled: "0",
  minimumAge: "18",
  restrictedProductNoindexEnabled: "1",
};

const adminFixtureReadiness = {
  status: "not_ready",
  checked_at: NOW,
  summary: {
    blocker_count: Number(productionRepairPlan?.summary?.blockerCount || 0),
    review_count:
      Number(productionRepairPlan?.details?.categoriesWithoutCustomBanner?.length || 0)
      + Number(productionRepairPlan?.details?.externalHomeNavItems?.length || 0),
    ready_check_count: 0,
    total_check_count: 5,
  },
  banners: {
    active_count: Number(productionRepairPlan?.summary?.activeBanners || 0),
    missing_count: Number(productionRepairPlan?.summary?.bannersWithoutResponsiveMedia || 0),
    items: (productionRepairPlan?.details?.bannerTitlesWithoutResponsiveMedia || []).map((title, index) => ({
      id: `fixture-banner-${index + 1}`,
      title,
      missing_mobile: true,
      missing_desktop: true,
    })),
  },
  categories: {
    visible_root_count: Number(productionRepairPlan?.summary?.visibleCategories || 0),
    review_count: Number(productionRepairPlan?.details?.categoriesWithoutCustomBanner?.length || 0),
    items: (productionRepairPlan?.details?.categoriesWithoutCustomBanner || []).map((name, index) => ({
      id: `fixture-category-${index + 1}`,
      name,
      banner_enabled: false,
    })),
  },
  navigation: {
    enabled_count: Number(productionRepairPlan?.summary?.enabledHomeNavItems || 0),
    invalid_count: Number(productionRepairPlan?.details?.invalidHomeNavItems?.length || 0),
    external_review_count: Number(productionRepairPlan?.details?.externalHomeNavItems?.length || 0),
    invalid_items: (productionRepairPlan?.details?.invalidHomeNavItems || []).map((item) => ({
      id: item.id,
      title: item.title,
      target_type: item.suggestedAction === "set_category" ? "category" : "url",
    })),
    external_items: (productionRepairPlan?.details?.externalHomeNavItems || []).map((item) => ({
      id: item.id,
      title: item.title,
      link_url: item.linkUrl,
    })),
  },
  products: {
    home_count: Number(productionRepairPlan?.summary?.homeProducts || 0),
    missing_count: adminFixtureProducts.length,
    items: (productionRepairPlan?.details?.productsWithoutEffectiveImage || []).map((item) => ({
      id: item.id,
      name: item.name,
      groups: [...new Set((item.occurrences || []).map((entry) => entry.group))],
    })),
  },
  compliance: {
    age_gate_enabled: false,
    minimum_age: Number(productionRepairPlan?.details?.complianceBlockers?.[0]?.minimumAge || 18),
    restricted_category_count: Number(productionRepairPlan?.summary?.restrictedCatalogCategories || 0),
    blocker_count: Number(productionRepairPlan?.summary?.complianceBlockers || 0),
    items: productionRepairPlan?.details?.complianceBlockers?.[0]?.restrictedCategories || [],
  },
};

const cartItem = {
  id: "fixture-cart-01",
  order_item_id: "fixture-order-item-01",
  product,
  qty: 1,
  unit_price: 89.9,
  subtotal: 89.9,
  can_review: false,
};

const addressPayload = {
  recipient_name: "视觉验收",
  phone: "0123456789",
  line1: "Jalan Sultan Ismail 1",
  line2: "Unit 08-18",
  city: "Kuala Lumpur",
  state: "Kuala Lumpur",
  postcode: "50250",
  country: "MY",
};

const address = {
  id: "fixture-address-01",
  name: addressPayload.recipient_name,
  phone: addressPayload.phone,
  address: `__MYADDR_V1__:${JSON.stringify(addressPayload)}`,
  isDefault: true,
};

const baseOrder = {
  id: "fixture-order-shipped",
  order_no: "QA202607290018",
  items: [cartItem],
  raw_amount: 89.9,
  discount_amount: 10,
  goods_original_amount: 99.9,
  goods_sale_amount: 89.9,
  goods_net_sales_amount: 79.9,
  activity_discount_amount: 10,
  coupon_discount_amount: 0,
  shipping_original_fee: 8,
  shipping_discount_amount: 8,
  total_discount_amount: 18,
  payable_amount: 79.9,
  paid_amount: 79.9,
  net_received_amount: 79.9,
  outstanding_amount: 0,
  coupon_title: "",
  shipping_fee: 0,
  shipping_name: "西马标准配送",
  total_amount: 79.9,
  total_points: 80,
  status: "shipped",
  payment_status: "paid",
  payment_method: "online",
  payment_channel: "billplz",
  payment_time: "2026-07-27T09:30:00.000Z",
  paid_at: "2026-07-27T09:30:00.000Z",
  note: "请工作日配送",
  created_at: "2026-07-27T09:20:00.000Z",
  shipped_at: "2026-07-28T06:10:00.000Z",
  contact_name: addressPayload.recipient_name,
  contact_phone: addressPayload.phone,
  address: "Jalan Sultan Ismail 1, Unit 08-18, Kuala Lumpur 50250, MY",
  tracking_no: "DMT202607290018",
  carrier: "J&T Express",
  logistics_status: "in_transit",
  logistics_status_label: "运输中",
  logistics_latest_event_at: "2026-07-29T08:20:00.000Z",
  return_request_count: 0,
  active_return_count: 0,
  auto_confirm_receive_enabled: true,
  auto_confirm_receive_days: 7,
  auto_confirm_receive_deadline_at: "2026-08-05T06:10:00.000Z",
  logistics_provider: {
    carrier: "J&T Express",
    carrier_code: "jnt",
    tracking_no: "DMT202607290018",
    tracking_url: "",
  },
  logistics_timeline: [
    {
      id: "track-03",
      order_id: "fixture-order-shipped",
      tracking_no: "DMT202607290018",
      carrier: "J&T Express",
      carrier_code: "jnt",
      status: "in_transit",
      status_label: "运输中",
      severity: "info",
      title: "包裹正在送往吉隆坡配送站",
      description: "预计明日安排派送。",
      location: "Kuala Lumpur",
      event_time: "2026-07-29T08:20:00.000Z",
      source: "fixture",
    },
    {
      id: "track-02",
      order_id: "fixture-order-shipped",
      tracking_no: "DMT202607290018",
      carrier: "J&T Express",
      carrier_code: "jnt",
      status: "picked_up",
      status_label: "已揽收",
      severity: "info",
      title: "快递已揽收",
      description: "商家已将包裹交给承运商。",
      location: "Selangor",
      event_time: "2026-07-28T10:10:00.000Z",
      source: "fixture",
    },
    {
      id: "track-01",
      order_id: "fixture-order-shipped",
      tracking_no: "DMT202607290018",
      carrier: "J&T Express",
      carrier_code: "jnt",
      status: "created",
      status_label: "已发货",
      severity: "info",
      title: "物流单已创建",
      description: "等待承运商揽收。",
      location: "Selangor",
      event_time: "2026-07-28T06:10:00.000Z",
      source: "fixture",
    },
  ],
};

const pendingOrder = {
  ...baseOrder,
  id: "fixture-order-pending",
  order_no: "QA202607290019",
  status: "pending",
  payment_status: "pending",
  payment_method: "online",
  payment_channel: "",
  payment_time: null,
  paid_at: null,
  shipped_at: null,
  tracking_no: "",
  carrier: "",
  logistics_timeline: [],
  total_amount: 89.9,
  payable_amount: 89.9,
  paid_amount: 0,
  outstanding_amount: 89.9,
  payment_timeout_enabled: true,
  payment_timeout_minutes: 30,
  payment_deadline_at: "2026-07-29T10:30:00.000Z",
};

const completedOrder = {
  ...baseOrder,
  id: "fixture-order-completed",
  order_no: "QA202607250006",
  status: "completed",
  completed_at: "2026-07-26T10:00:00.000Z",
  can_review: true,
  tracking_no: "DMT202607250006",
};

const orders = [pendingOrder, baseOrder, completedOrder];

const returnRequest = {
  id: "fixture-return-01",
  order_id: completedOrder.id,
  order_no: completedOrder.order_no,
  order_item_id: cartItem.order_item_id,
  product_id: product.id,
  quantity: 1,
  type: "return_refund",
  reason: "商品外包装破损",
  description: "收到包裹时外包装有明显压痕，已上传凭证等待处理。",
  images: [],
  status: "processing",
  refund_amount: 79.9,
  contact_phone: addressPayload.phone,
  product_name: product.name,
  product_image: product.cover_image,
  variant_name: "",
  purchased_qty: 1,
  unit_price: 89.9,
  created_at: "2026-07-27T12:00:00.000Z",
  updated_at: "2026-07-29T08:00:00.000Z",
  events: [
    {
      id: "return-event-03",
      return_id: "fixture-return-01",
      actor_type: "admin",
      event_type: "processing",
      from_status: "approved",
      to_status: "processing",
      title: "商家正在处理",
      note: "退款资料已进入财务复核。",
      created_at: "2026-07-29T08:00:00.000Z",
    },
    {
      id: "return-event-02",
      return_id: "fixture-return-01",
      actor_type: "admin",
      event_type: "approved",
      from_status: "pending",
      to_status: "approved",
      title: "售后申请已通过",
      note: "请保留商品及包装，等待后续通知。",
      created_at: "2026-07-28T03:20:00.000Z",
    },
    {
      id: "return-event-01",
      return_id: "fixture-return-01",
      actor_type: "user",
      event_type: "created",
      from_status: null,
      to_status: "pending",
      title: "已提交售后申请",
      note: "商品外包装破损",
      created_at: "2026-07-27T12:00:00.000Z",
    },
  ],
  shipments: [],
  logistics_tracks: [],
  refund_records: [],
  refund_summary: {
    order_payment_status: "paid",
    order_refund_status: "processing",
    order_refunded_amount: 0,
    refund_amount: 79.9,
  },
};

const profile = {
  id: "fixture-user-01",
  nickname: "城市生活会员",
  avatar: "",
  phone: "012****789",
  wechat: "",
  whatsapp: "6012****789",
  birthday: "1992-08-18",
  birthday_locked: true,
  inviteCode: "CITY2026",
  parentInviteCode: "",
  pointsBalance: 2368,
  subordinateEnabled: true,
  memberLevel: {
    id: "gold",
    name: "黄金会员",
    description: "城市生活优享会员",
    min_spent: 500,
    min_orders: 3,
    discount_rate: 0.95,
    points_multiplier: 1.2,
    free_shipping_enabled: true,
    sort_order: 2,
    enabled: true,
  },
};

const pointsRecords = [
  {
    id: "points-01",
    user_id: profile.id,
    order_id: completedOrder.id,
    order_no: completedOrder.order_no,
    action: "order_earn",
    amount: 80,
    balance_before: 2288,
    balance_after: 2368,
    description: "订单完成获得积分",
    status: "success",
    created_at: "2026-07-26T10:00:00.000Z",
  },
  {
    id: "points-02",
    user_id: profile.id,
    action: "sign_in",
    amount: 10,
    balance_before: 2278,
    balance_after: 2288,
    description: "每日签到",
    status: "success",
    created_at: NOW,
  },
  {
    id: "points-03",
    user_id: profile.id,
    action: "redeem",
    amount: -300,
    balance_before: 2578,
    balance_after: 2278,
    description: "积分商城兑换",
    status: "success",
    created_at: "2026-07-20T04:00:00.000Z",
  },
];

const rewardTransactions = [
  {
    id: "reward-tx-01",
    user_id: profile.id,
    order_id: completedOrder.id,
    order_no: completedOrder.order_no,
    type: "settle",
    amount: 8.6,
    status: "success",
    reason: "订单完成返现入账",
    created_at: "2026-07-26T10:00:00.000Z",
  },
  {
    id: "reward-tx-02",
    user_id: profile.id,
    order_id: baseOrder.id,
    order_no: baseOrder.order_no,
    type: "wallet_redeem_order",
    amount: -5,
    status: "success",
    reason: "订单结算抵扣",
    created_at: "2026-07-27T09:30:00.000Z",
  },
  {
    id: "reward-tx-03",
    user_id: profile.id,
    type: "settle",
    amount: 4.2,
    status: "pending",
    reason: "邀请好友订单待结算",
    created_at: "2026-07-29T06:30:00.000Z",
  },
];

const loyaltyConfig = {
  points: { displayEnabled: true, earnEnabled: true, redeemEnabled: true },
  reward: {
    displayEnabled: true,
    referralEnabled: true,
    walletRedeemEnabled: true,
    withdrawEnabled: false,
  },
  checkout: {
    onlinePaymentEnabled: true,
    customerServicePaymentEnabled: true,
    pointsRedeemEnabled: true,
    rewardCashRedeemEnabled: true,
  },
};

const memberLevel = {
  ...profile.memberLevel,
  benefits: [
    { type: "discount", name: "会员折扣", description: "指定商品享会员价格" },
    { type: "points", name: "双倍积分", description: "购物积分加速累计" },
    { type: "shipping", name: "专享配送", description: "指定订单享配送优惠" },
    { type: "service", name: "优先客服", description: "咨询问题优先响应" },
  ],
};

const memberBenefits = {
  user_id: profile.id,
  nickname: profile.nickname,
  avatar: profile.avatar,
  current_points: profile.pointsBalance,
  current_growth_value: 860,
  birthday_completed: true,
  profile_completed: true,
  current_level: memberLevel,
  next_level: {
    id: "platinum",
    name: "铂金会员",
    description: "高阶会员权益",
    min_spent: 1500,
    min_orders: 10,
    discount_rate: 0.92,
    points_multiplier: 1.5,
    free_shipping_enabled: true,
    sort_order: 3,
    enabled: true,
  },
  points_to_next_level: 632,
  growth_to_next_level: 640,
  orders_to_next_level: 4,
  all_levels: [
    {
      id: "standard",
      name: "普通会员",
      min_spent: 0,
      min_orders: 0,
      discount_rate: 1,
      points_multiplier: 1,
      sort_order: 1,
      enabled: true,
      benefits: [],
    },
    memberLevel,
  ],
  stats: { total_spent: 860, order_count: 6 },
};

const paginated = (list, pageSize = 20) => ({
  list,
  total: list.length,
  page: 1,
  pageSize,
  totalPages: Math.max(1, Math.ceil(list.length / pageSize)),
});

const ok = (data = null, message = "成功") => ({
  code: 0,
  message,
  data,
  traceId: "local-fixed-client-fixture",
});

function writeJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-credentials": "true",
  });
  res.end(JSON.stringify(body));
}

function writeFixtureMedia(res, pathname, method) {
  const name = decodeURIComponent(pathname.slice("/fixture-media/".length));
  if (!/^[a-z0-9-]+\.webp$/i.test(name)) {
    writeJson(res, 404, { code: 404, message: "验收素材不存在", data: null });
    return;
  }
  try {
    const body = readFileSync(new URL(name, FIXTURE_MEDIA_ROOT));
    res.writeHead(200, {
      "content-type": "image/webp",
      "content-length": body.byteLength,
      "cache-control": "no-store",
    });
    res.end(method === "HEAD" ? undefined : body);
  } catch {
    writeJson(res, 404, { code: 404, message: "验收素材不存在", data: null });
  }
}

function orderById(id) {
  return orders.find((item) => item.id === id || item.order_no === id) || baseOrder;
}

function fixtureResponse(pathname, method, searchParams = new URLSearchParams()) {
  if (pathname === "/health/live") return ok({ status: "live", fixture: true, adminFixture: true });
  if (pathname === "/categories" && method === "GET") return ok(fixtureCategories);
  const categoryMatch = pathname.match(/^\/categories\/([^/]+)$/);
  if (categoryMatch && method === "GET") {
    const categoryId = decodeURIComponent(categoryMatch[1]);
    return ok(fixtureCategories.find((item) => item.id === categoryId) || fixtureCategories[0]);
  }
  if (pathname === "/products/home" && method === "GET") {
    return ok({
      hot: fixtureProducts.filter((item) => item.is_hot).slice(0, 6),
      new_arrivals: fixtureProducts.filter((item) => item.is_new).slice(0, 6),
      recommended: fixtureProducts.filter((item) => item.is_recommended).slice(0, 6),
    });
  }
  if (pathname === "/products/tags" && method === "GET") {
    return ok([
      { id: "fixture-tag-local", name: "本地仓", sort_order: 1 },
      { id: "fixture-tag-member", name: "会员精选", sort_order: 2 },
    ]);
  }
  if (pathname === "/products" && method === "GET") {
    let list = [...fixtureProducts];
    const categoryId = String(searchParams.get("category_id") || "").trim();
    const keyword = String(searchParams.get("keyword") || "").trim().toLowerCase();
    const minPrice = Number(searchParams.get("min_price"));
    const maxPrice = Number(searchParams.get("max_price"));
    const sort = String(searchParams.get("sort") || "");
    if (categoryId) list = list.filter((item) => item.category_id === categoryId);
    if (keyword) {
      list = list.filter((item) => (
        `${item.name} ${item.category_name || ""} ${item.description || ""}`.toLowerCase().includes(keyword)
      ));
    }
    if (searchParams.get("is_new")) list = list.filter((item) => item.is_new);
    if (searchParams.get("is_hot")) list = list.filter((item) => item.is_hot);
    if (searchParams.get("is_recommended")) list = list.filter((item) => item.is_recommended);
    if (searchParams.get("in_stock")) list = list.filter((item) => item.stock > 0);
    if (Number.isFinite(minPrice) && searchParams.has("min_price")) {
      list = list.filter((item) => Number(item.effective_price || item.price) >= minPrice);
    }
    if (Number.isFinite(maxPrice) && searchParams.has("max_price")) {
      list = list.filter((item) => Number(item.effective_price || item.price) <= maxPrice);
    }
    if (sort === "sales") list.sort((left, right) => Number(right.sales_count || 0) - Number(left.sales_count || 0));
    if (sort === "newest") list.sort((left, right) => Number(right.is_new) - Number(left.is_new));
    if (sort === "price-asc") list.sort((left, right) => Number(left.effective_price || left.price) - Number(right.effective_price || right.price));
    if (sort === "price-desc") list.sort((left, right) => Number(right.effective_price || right.price) - Number(left.effective_price || left.price));
    const pageSize = Math.max(1, Math.min(60, Number(searchParams.get("pageSize")) || 24));
    return ok(paginated(list.slice(0, pageSize), pageSize));
  }
  const productRelatedMatch = pathname.match(/^\/products\/([^/]+)\/related$/);
  if (productRelatedMatch && method === "GET") {
    const productId = decodeURIComponent(productRelatedMatch[1]);
    const limit = Math.max(1, Math.min(12, Number(searchParams.get("limit")) || 4));
    return ok(fixtureProducts.filter((item) => item.id !== productId).slice(0, limit));
  }
  const productMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (productMatch && method === "GET") {
    const productId = decodeURIComponent(productMatch[1]);
    return ok(fixtureProducts.find((item) => item.id === productId) || product);
  }
  if (pathname === "/marketing/promotions" && method === "GET") {
    const requestedType = String(searchParams.get("type") || "").trim();
    const list = requestedType
      ? fixturePromotions.filter((item) => item.type === requestedType)
      : fixturePromotions;
    return ok({
      ...paginated(list, Math.max(1, Number(searchParams.get("pageSize")) || 60)),
      totalPages: 1,
    });
  }
  const promotionMatch = pathname.match(/^\/marketing\/promotions\/([^/]+)$/);
  if (promotionMatch && method === "GET") {
    const slug = decodeURIComponent(promotionMatch[1]);
    return ok(fixturePromotions.find((item) => item.slug === slug) || fixturePromotions[0]);
  }
  if (pathname === "/marketing/activities/flash-sale" && method === "GET") {
    const flash = fixturePromotions[0];
    return ok({
      id: flash.id,
      slug: flash.slug,
      type: flash.type,
      title: flash.title,
      subtitle: flash.subtitle,
      cover_image: flash.cover_image,
      href: flash.href,
      start_at: flash.start_at,
      end_at: flash.end_at,
      countdown_seconds: flash.countdown_seconds,
      items: flash.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        cover_image: item.cover_image,
        original_price: item.product_price,
        flash_price: item.activity_price,
        activity_stock: item.activity_stock,
        sold_count: item.sold_count,
        remaining_stock: item.remaining_stock,
        limit_per_user: item.limit_per_user,
      })),
    });
  }
  if (pathname === "/marketing/campaigns/home" && method === "GET") {
    return ok({
      campaigns: fixturePromotions.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        promoLabel: item.promo_label,
        coverImage: item.cover_image,
        href: item.href,
        startsAt: item.start_at,
        endsAt: item.end_at,
        countdownSeconds: item.countdown_seconds,
        source: "local",
      })),
    });
  }
  if (pathname === "/admin/auth/login" && method === "POST") {
    return ok({
      token: {
        accessToken: "fixture-admin-access",
        refreshToken: "fixture-admin-refresh",
      },
      csrfToken: "fixture-admin-csrf",
      userId: adminFixtureProfile.id,
      role: adminFixtureProfile.role,
      permissions: adminFixtureProfile.permissions,
      isSuperAdmin: true,
      roleCodes: adminFixtureProfile.roleCodes,
    });
  }
  if (pathname === "/admin/auth/refresh") {
    return ok({ accessToken: "fixture-admin-access" });
  }
  if (pathname === "/admin/auth/csrf") {
    return ok({ csrfToken: "fixture-admin-csrf" });
  }
  if (pathname === "/admin/auth/logout" && method === "POST") return ok(null);
  if (pathname === "/admin/account/profile") return ok(adminFixtureProfile);
  if (pathname === "/admin/settings" && method === "GET") return ok(adminFixtureSettings);
  if (pathname === "/admin/settings/features" && method === "GET") {
    return ok({
      mallEnabled: true,
      serviceEnabled: true,
      onlinePaymentEnabled: true,
      pointsEnabled: true,
      couponEnabled: true,
      reviewEnabled: true,
      inventoryEnabled: true,
      shippingEnabled: true,
      memberLevelEnabled: true,
      customerServiceDownloadEnabled: true,
      smsOtpLoginEnabled: false,
      telegramOrderNotifyEnabled: false,
      languageGateEnabled: false,
      storefrontMultilingualEnabled: false,
      restrictedProductComplianceEnabled: true,
      trafficAnalyticsEnabled: false,
      billplzEnabled: false,
      promotionEngineV2: false,
      pricingEngineV2: false,
      inventoryLockV2: false,
      downloadConfirmEnabled: true,
    });
  }
  if (pathname === "/admin/home-ops/storefront-readiness" && method === "GET") {
    return ok(adminFixtureReadiness);
  }
  if (pathname === "/admin/home-ops/nav-items" && method === "GET") return ok(adminFixtureNavItems);
  if (pathname === "/admin/home-ops/support-channels" && method === "GET") return ok([]);
  if (pathname === "/admin/products" && method === "GET") {
    const requestedIds = String(searchParams.get("ids") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const priorityById = new Map(requestedIds.map((id, index) => [id, index]));
    const filteredProducts = requestedIds.length
      ? adminFixtureProducts
        .filter((item) => priorityById.has(item.id))
        .sort((left, right) => (
          (priorityById.get(left.id) ?? Number.MAX_SAFE_INTEGER)
          - (priorityById.get(right.id) ?? Number.MAX_SAFE_INTEGER)
        ))
      : adminFixtureProducts;
    const pageSize = Math.max(1, Math.min(50, Number(searchParams.get("pageSize")) || 20));
    return ok({
      list: filteredProducts.slice(0, pageSize),
      total: filteredProducts.length,
      page: 1,
      pageSize,
      totalPages: Math.ceil(filteredProducts.length / pageSize),
    });
  }
  if (pathname === "/admin/banners" && method === "GET") return ok(adminFixtureBanners);
  const adminProductMatch = pathname.match(/^\/admin\/products\/([^/]+)$/);
  if (adminProductMatch && method === "GET") {
    const id = decodeURIComponent(adminProductMatch[1]);
    return ok(adminFixtureProducts.find((item) => item.id === id) || adminFixtureProducts[0]);
  }
  if (pathname === "/admin/categories" && method === "GET") return ok(adminFixtureCategories);
  if (pathname === "/admin/product-tags" && method === "GET") return ok([]);
  if (pathname === "/admin/order-events/recent" && method === "GET") return ok([]);
  if (pathname === "/admin/notifications/unread-count" && method === "GET") return ok({ count: 0 });
  if (pathname === "/admin/events" && method === "GET") return ok(null);
  if (pathname.startsWith("/admin/") && (method === "GET" || method === "HEAD")) return ok([]);
  if (pathname === "/auth/features") {
    return ok({ smsOtpLoginEnabled: false, wechatLoginEnabled: false });
  }
  if (pathname === "/auth/login" || pathname === "/auth/register") {
    return ok({
      token: {
        accessToken: "fixture-access-token",
        refreshToken: "fixture-refresh-token",
        expiresIn: 3600,
      },
      userId: profile.id,
      role: "user",
    });
  }
  if (pathname === "/auth/session" || pathname === "/auth/refresh/session") {
    return ok({ authenticated: true });
  }
  if (pathname === "/auth/refresh") return ok({ accessToken: "fixture-session" });
  if (pathname === "/user/profile") return ok(profile);
  if (pathname === "/me/summary") {
    return ok({
      profile,
      orderSummary: {
        pending_payment: 1,
        pending_ship: 0,
        pending_receive: 1,
        pending_review: 1,
        after_sale: 1,
        completed: 1,
        cancelled: 0,
      },
      couponCount: 2,
      favoriteCount: 1,
      unreadCount: 2,
      inviteStats: {
        totalInvited: 8,
        totalReward: 42.6,
        directCount: 6,
        indirectCount: 2,
        totalOrderAmount: 768,
      },
      rewardBalance: { balance: 68.5, pendingAmount: 4.2 },
      loyaltyConfig,
    });
  }
  if (pathname === "/me/wechat-binding") return ok({ bound: false, wechatLoginEnabled: true });
  if (pathname === "/loyalty/config") return ok(loyaltyConfig);
  if (pathname === "/cart") return ok([cartItem]);
  if (pathname === "/cart/preview") {
    return ok({
      items: [cartItem],
      goods_amount: 89.9,
      flash_sale_discount: 10,
      full_reduction_discount: 0,
      coupon_discount: 0,
      discount_amount: 10,
      shipping_fee: 0,
      final_amount: 79.9,
      discount_lines: [{ type: "activity", label: "本地视觉验收优惠", amount: 10 }],
    });
  }
  if (pathname === "/addresses") return ok([address]);
  if (pathname === "/shipping") {
    return ok([
      {
        id: "fixture-shipping-west",
        name: "西马标准配送",
        regions: "West Malaysia",
        countryCode: "MY",
        regionGroup: "west_malaysia",
        baseFee: 8,
        freeAbove: 79,
        extraPerKg: 1.5,
        enabled: true,
        isDefault: true,
      },
    ]);
  }
  if (pathname === "/shipping/quote") {
    return ok({
      shipping_template_id: "fixture-shipping-west",
      shipping_name: "西马标准配送",
      shipping_fee: 0,
      destination: { country: "MY", state: "Kuala Lumpur", city: "Kuala Lumpur", postcode: "50250" },
    });
  }
  if (pathname === "/payments/channels") {
    return ok([
      {
        id: "fixture-payment-online",
        code: "online",
        name: "在线支付",
        provider: "billplz",
        country_code: "MY",
        currency: "MYR",
        sort_order: 1,
        environment: "fixture",
      },
      {
        id: "fixture-payment-service",
        code: "whatsapp",
        name: "联系客服支付",
        provider: "manual",
        country_code: "MY",
        currency: "MYR",
        sort_order: 2,
        environment: "fixture",
      },
    ]);
  }
  if (pathname === "/payment/config") {
    return ok({
      mockPayment: true,
      stripeReady: false,
      stripeCheckoutReady: false,
      publicAppUrlConfigured: true,
      stripeWebhookUrl: "",
      docs: "",
    });
  }
  if (pathname === "/orders/summary") {
    return ok({
      pending_payment: 1,
      pending_ship: 0,
      pending_receive: 1,
      pending_review: 1,
      after_sale: 1,
      completed: 1,
      cancelled: 0,
    });
  }
  if (pathname === "/orders" && method === "GET") return ok(paginated(orders));
  if (pathname === "/orders/preview") {
    return ok({
      goods_amount: 89.9,
      flash_sale_discount: 10,
      full_reduction_discount: 0,
      coupon_discount: 0,
      discount_amount: 10,
      shipping_fee: 0,
      final_amount: 79.9,
      total_points: 80,
      earned_points: 80,
      available_points: 2368,
      max_usable_points: 1000,
      points_used: 0,
      points_discount_amount: 0,
      point_value_myr: 0.01,
      min_redeem_points: 100,
      redeem_step: 100,
      available_reward_balance: 68.5,
      max_usable_reward_cash: 68.5,
      reward_cash_discount_amount: 0,
      discount_lines: [{ type: "activity", label: "活动优惠", amount: 10 }],
    });
  }
  if (pathname === "/orders/checkout/coupons") {
    return ok({
      usable: [
        {
          id: "fixture-user-coupon",
          user_coupon_id: "fixture-user-coupon",
          couponId: "fixture-coupon",
          title: "会员满 RM80 减 RM10",
          discount: 10,
          discountType: "fixed",
          condition: 80,
          expire: "2026-08-31",
          variantIndex: 0,
          usable: true,
          discount_amount: 10,
          scopeText: "全场商品",
        },
      ],
      unusable: [],
      best_coupon_id: "fixture-user-coupon",
      has_more: false,
    });
  }
  const orderMatch = pathname.match(/^\/orders\/([^/]+)(?:\/logistics)?$/);
  if (orderMatch) return ok(orderById(decodeURIComponent(orderMatch[1])));
  if (pathname === "/returns") return ok(paginated([returnRequest]));
  const returnMatch = pathname.match(/^\/returns\/([^/]+)$/);
  if (returnMatch) return ok(returnRequest);
  if (pathname === "/points/balance") return ok({ balance: 2368 });
  if (pathname === "/points/config") {
    return ok({
      signIn: { points: 10, enabled: true, usesDefault: false, disabledReason: null },
      orderPointsHint: "完成订单可获得积分",
    });
  }
  if (pathname === "/points/records") return ok(paginated(pointsRecords));
  if (pathname === "/points/gifts") {
    return ok({
      list: [
        {
          id: "gift-01",
          title: "城市生活精选礼盒",
          image: product.cover_image,
          required_points: 1200,
          cash_amount: 0,
          remaining_stock: 18,
          limit_per_user: 1,
          product_id: product.id,
        },
        {
          id: "gift-02",
          title: "RM10 购物抵扣券",
          image: "/assets/fixed-storefront/home-banner-03-coupon-activity-mobile.webp",
          required_points: 800,
          cash_amount: 0,
          remaining_stock: 36,
          limit_per_user: 2,
          product_id: "",
        },
      ],
    });
  }
  if (pathname === "/rewards/balance") return ok({ balance: 68.5, pendingAmount: 4.2, totalSpent: 15 });
  if (pathname === "/rewards/config") {
    return ok({
      balance: 68.5,
      pendingAmount: 4.2,
      stats: { totalEarned: 87.7, totalSpent: 15, reversedAmount: 4.2 },
      display: {
        balanceLabel: "购物可用返现",
        usageNotice: "返现金额可在结算时抵扣，不支持提现。",
      },
    });
  }
  if (pathname === "/rewards/transactions") return ok(paginated(rewardTransactions));
  if (pathname === "/rewards/records") return ok(paginated([]));
  if (pathname === "/invite/stats") {
    return ok({
      totalInvited: 8,
      totalReward: 42.6,
      directCount: 6,
      indirectCount: 2,
      totalOrderAmount: 768,
    });
  }
  if (pathname === "/invite/records") {
    return ok(paginated([
      {
        id: "invite-01",
        inviter_id: profile.id,
        invitee_id: "fixture-invitee-01",
        invitee_nickname: "林小姐",
        invitee_avatar: "",
        invite_code: profile.inviteCode,
        status: "ordered",
        reward_amount: 8.6,
        created_at: "2026-07-25T08:00:00.000Z",
      },
      {
        id: "invite-02",
        inviter_id: profile.id,
        invitee_id: "fixture-invitee-02",
        invitee_nickname: "陈先生",
        invitee_avatar: "",
        invite_code: profile.inviteCode,
        status: "registered",
        reward_amount: 0,
        created_at: "2026-07-22T03:00:00.000Z",
      },
    ]));
  }
  if (pathname === "/user/member-benefits") return ok(memberBenefits);
  if (pathname === "/coupons/mine") {
    return ok(paginated([
      {
        id: "fixture-user-coupon",
        coupon: {
          id: "fixture-coupon",
          code: "CITY10",
          title: "会员满 RM80 减 RM10",
          type: "fixed",
          value: 10,
          min_amount: 80,
          start_date: "2026-07-01T00:00:00.000Z",
          end_date: "2026-08-31T23:59:59.000Z",
          status: "available",
          description: "全场商品可用",
          scope_type: "all",
        },
        claimed_at: "2026-07-20T03:00:00.000Z",
        status: "available",
        valid_from: "2026-07-20T03:00:00.000Z",
        valid_until: "2026-08-31T23:59:59.000Z",
      },
    ]));
  }
  if (pathname === "/coupons/available") return ok([]);
  if (pathname === "/coupons/center") {
    return ok({ usable_count: 1, claimable_count: 0, my_usable_coupons: [], claimable_coupons: [] });
  }
  if (pathname === "/reviews/pending-items") {
    return ok([
      {
        order_id: completedOrder.id,
        order_no: completedOrder.order_no,
        order_item_id: cartItem.order_item_id,
        product_id: product.id,
        product_name: product.name,
        product_image: product.cover_image,
        qty: 1,
        completed_at: completedOrder.completed_at,
      },
    ]);
  }
  if (pathname === "/notifications") {
    return ok(paginated([
      {
        id: "notice-01",
        type: "shipping",
        title: "包裹正在运输中",
        content: "订单 QA202607290018 已到达吉隆坡配送站。",
        is_read: false,
        created_at: "2026-07-29T08:20:00.000Z",
        link_url: `/orders/${baseOrder.id}/logistics`,
      },
      {
        id: "notice-02",
        type: "points",
        title: "积分已入账",
        content: "订单完成获得 80 积分。",
        is_read: false,
        created_at: "2026-07-26T10:00:00.000Z",
        link_url: "/points",
      },
      {
        id: "notice-03",
        type: "promotion",
        title: "会员专享活动",
        content: "本周会员精选活动已经开始。",
        is_read: true,
        created_at: "2026-07-24T02:00:00.000Z",
        link_url: "/promotions",
      },
    ]));
  }
  if (pathname === "/notifications/unread-count") return ok({ count: 2 });
  if (pathname === "/favorites") return ok(paginated([product]));
  if (pathname === "/history") {
    return ok(paginated([{ id: "history-01", viewed_at: NOW, product }]));
  }
  if (pathname === "/analytics/events" || pathname === "/tracking/events" || pathname === "/privacy/consents") {
    return ok(null);
  }
  if (method !== "GET" && method !== "HEAD") {
    if (/^\/(notifications|cart|orders|returns|points|rewards|reviews|favorites|history|feedback)/.test(pathname)) {
      return ok(null, "本地验收操作已模拟");
    }
    return { __status: 405, body: { code: 405, message: "本地验收环境拒绝未声明的写操作", data: null } };
  }
  return null;
}

async function forwardReadOnly(req, res, url, pathname) {
  const target = `${UPSTREAM_API}${pathname}${url.search}`;
  const upstream = await fetch(target, {
    method: req.method,
    headers: {
      accept: req.headers.accept || "application/json",
      "accept-language": req.headers["accept-language"] || "zh-CN",
      "user-agent": "fixed-client-local-fixture/1.0",
    },
    redirect: "manual",
  });
  const body = Buffer.from(await upstream.arrayBuffer());
  res.writeHead(upstream.status, {
    "content-type": upstream.headers.get("content-type") || "application/octet-stream",
    "cache-control": "no-store",
    "x-fixture-upstream": "read-only",
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const method = String(req.method || "GET").toUpperCase();
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,authorization,x-csrf-token",
    });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const pathname = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  if (pathname.startsWith("/fixture-media/") && (method === "GET" || method === "HEAD")) {
    writeFixtureMedia(res, pathname, method);
    return;
  }
  const fixture = fixtureResponse(pathname, method, url.searchParams);
  if (fixture) {
    if (fixture.__status) writeJson(res, fixture.__status, fixture.body);
    else writeJson(res, 200, fixture);
    return;
  }

  if (method !== "GET" && method !== "HEAD") {
    writeJson(res, 405, {
      code: 405,
      message: "本地验收环境只允许向上游执行只读请求",
      data: null,
    });
    return;
  }

  try {
    await forwardReadOnly(req, res, url, pathname);
  } catch (error) {
    writeJson(res, 502, {
      code: 502,
      message: error instanceof Error ? error.message : "只读上游请求失败",
      data: null,
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Fixed-client fixture API listening on http://${HOST}:${PORT}`);
  console.log(`Unknown GET/HEAD requests use read-only upstream ${UPSTREAM_API}`);
  console.log("Unknown write requests are rejected and never forwarded.");
});
