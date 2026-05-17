/** 营销活动展示位（与前台模块、页面区块对应） */
const DISPLAY_POSITIONS = [
  'home_flash_sale',
  'home_coupon_center',
  'home_new_user_gift',
  'product_detail',
  'category_badge',
  'cart_notice',
  'checkout_notice',
  'profile_center',
  'promotion_banner',
];

const DISPLAY_POSITION_LABELS = {
  home_flash_sale: '首页秒杀专区',
  home_coupon_center: '首页领券中心',
  home_new_user_gift: '首页新人礼包',
  product_detail: '商品详情',
  category_badge: '分类角标',
  cart_notice: '购物车提示',
  checkout_notice: '结算页提示',
  profile_center: '个人中心',
  promotion_banner: '促销横幅',
};

const PUBLISHABLE_ACTIVITY_TYPES = ['flash_sale', 'full_reduction', 'coupon_activity', 'new_user_gift'];

/** 尚未实现运行时逻辑的活动类型（仅可草稿） */
const WIP_ACTIVITY_TYPES = ['member_activity', 'points_bonus', 'cashback_activity'];

function isValidDisplayPosition(value) {
  return DISPLAY_POSITIONS.includes(String(value || '').trim());
}

function normalizeDisplayPositions(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((x) => String(x || '').trim()).filter(isValidDisplayPosition))];
}

function labelDisplayPositions(list) {
  return normalizeDisplayPositions(list).map((k) => DISPLAY_POSITION_LABELS[k] || k);
}

module.exports = {
  DISPLAY_POSITIONS,
  DISPLAY_POSITION_LABELS,
  PUBLISHABLE_ACTIVITY_TYPES,
  WIP_ACTIVITY_TYPES,
  isValidDisplayPosition,
  normalizeDisplayPositions,
  labelDisplayPositions,
};
