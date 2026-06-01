const DEFAULT_SKIN_ID = 'default_life_green';
const FESTIVAL_SKIN_ID = 'festive_ruby_gold';

const STOREFRONT_DESIGN_LOCKS = {
  radius: '14px',
  fontFamily: "system-ui, -apple-system, 'PingFang SC', sans-serif",
  shadowStyle: 'soft',
  buttonStyle: 'pill',
  navStyle: 'glass',
  badgeStyle: 'soft',
  priceStyle: 'luxury',
  productCardVariant: 'premium',
  cardStyle: 'elevated',
  cardTextAlign: 'left',
  imageRatio: '1 / 1',
  imageFit: 'cover',
  homeLayout: 'classic',
  headerStyle: 'clean',
  bannerStyle: 'fresh',
  couponStyle: 'premium',
  memberCardStyle: 'light',
  categoryIconStyle: 'soft',
  motionLevel: 'rich',
  density: 'comfortable',
  adminThemeMode: 'fixed',
};

const DEFAULT_LIFE_GREEN_CONFIG = {
  skinName: '日常购物皮肤',
  bgColor: '#F5F7F3',
  surfaceColor: '#FFFFFF',
  primaryColor: '#075F4A',
  secondaryColor: '#E7F0EA',
  accentColor: '#B98A3D',
  priceColor: '#C7462F',
  textColor: '#17211F',
  mutedTextColor: '#68756F',
  borderColor: '#DDE7DF',
  successColor: '#168A62',
  warningColor: '#C98A2E',
  dangerColor: '#C7462F',
  ...STOREFRONT_DESIGN_LOCKS,
};

const FESTIVAL_RUBY_GOLD_CONFIG = {
  skinName: '节日促销皮肤',
  bgColor: '#FFF8F3',
  surfaceColor: '#FFFFFF',
  primaryColor: '#B91C2B',
  secondaryColor: '#FBE7E2',
  accentColor: '#C79A3B',
  priceColor: '#D62828',
  textColor: '#2D1D1B',
  mutedTextColor: '#806C68',
  borderColor: '#F1DCD3',
  successColor: '#1E7A52',
  warningColor: '#D49B2A',
  dangerColor: '#B91C2B',
  ...STOREFRONT_DESIGN_LOCKS,
};

const DAILY_COMMERCE_SKIN = {
  id: DEFAULT_SKIN_ID,
  name: '日常购物皮肤',
  description: '全年默认使用的高级商城皮肤：象牙白底、孔雀石绿品牌色、香槟金细节和朱砂红价格，干净、整齐、耐看，适合日常购物转化。',
  sceneTag: 'mall',
  config: DEFAULT_LIFE_GREEN_CONFIG,
};

const FESTIVAL_RUBY_GOLD_SKIN = {
  id: FESTIVAL_SKIN_ID,
  name: '节日促销皮肤',
  description: '适合节日和大促自动启用，暖白底配红金点缀，有氛围但不刺眼。',
  sceneTag: 'holiday',
  config: FESTIVAL_RUBY_GOLD_CONFIG,
};

const DEFAULT_THEME_HOLIDAY_RULES = [
  { id: 'new_year', name: '元旦 / 新年', enabled: true, start: '01-01', end: '01-03', skinId: FESTIVAL_SKIN_ID },
  { id: 'cny', name: '春节档', enabled: false, start: '02-01', end: '02-17', skinId: FESTIVAL_SKIN_ID },
  { id: 'hari_raya', name: '开斋节档', enabled: false, start: '03-18', end: '03-25', skinId: FESTIVAL_SKIN_ID },
  { id: 'merdeka', name: '马来西亚国庆', enabled: true, start: '08-29', end: '09-01', skinId: FESTIVAL_SKIN_ID },
  { id: 'double_11', name: '双11大促', enabled: true, start: '11-01', end: '11-12', skinId: FESTIVAL_SKIN_ID },
  { id: 'double_12', name: '双12年终促销', enabled: true, start: '12-01', end: '12-13', skinId: FESTIVAL_SKIN_ID },
  { id: 'christmas', name: '圣诞 / 年末', enabled: true, start: '12-20', end: '12-27', skinId: FESTIVAL_SKIN_ID },
];

const FALLBACK_THEME_SKIN = DAILY_COMMERCE_SKIN;
const THEME_PRESETS = [DAILY_COMMERCE_SKIN, FESTIVAL_RUBY_GOLD_SKIN];
const DEFAULT_HOLIDAY_SKIN_ID = FESTIVAL_SKIN_ID;

/** @deprecated */
const CLASSIC_GOLD_BLACK_CONFIG = DEFAULT_LIFE_GREEN_CONFIG;
/** @deprecated */
const PROMO_SKIN_ID = FESTIVAL_SKIN_ID;

module.exports = {
  DEFAULT_SKIN_ID,
  FESTIVAL_SKIN_ID,
  DEFAULT_HOLIDAY_SKIN_ID,
  DEFAULT_THEME_HOLIDAY_RULES,
  STOREFRONT_DESIGN_LOCKS,
  DEFAULT_LIFE_GREEN_CONFIG,
  FESTIVAL_RUBY_GOLD_CONFIG,
  DAILY_COMMERCE_SKIN,
  FESTIVAL_RUBY_GOLD_SKIN,
  CLASSIC_GOLD_BLACK_CONFIG,
  FALLBACK_THEME_SKIN,
  THEME_PRESETS,
  PROMO_SKIN_ID,
};
