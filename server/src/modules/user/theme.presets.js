const DEFAULT_SKIN_ID = 'default_life_green';

const DEFAULT_LIFE_GREEN_CONFIG = {
  skinName: '大马通默认生活服务绿',
  bgColor: '#F5F7FA',
  surfaceColor: '#FFFFFF',
  primaryColor: '#00B14F',
  secondaryColor: '#E0F5E9',
  accentColor: '#FFC107',
  priceColor: '#FF5722',
  textColor: '#333333',
  mutedTextColor: '#888888',
  borderColor: '#E5E7EB',
  successColor: '#00A65A',
  warningColor: '#FF9800',
  dangerColor: '#F44336',
  radius: '12px',
  fontFamily: "system-ui, -apple-system, 'PingFang SC', sans-serif",
  shadowStyle: 'soft',
  buttonStyle: 'rounded',
  navStyle: 'floating',
  badgeStyle: 'soft',
  priceStyle: 'bold',
  productCardVariant: 'standard',
  cardStyle: 'elevated',
  cardTextAlign: 'left',
  imageRatio: '1 / 1',
  imageFit: 'cover',
  homeLayout: 'classic',
  headerStyle: 'clean',
  bannerStyle: 'fresh',
  couponStyle: 'ticket',
  memberCardStyle: 'light',
  categoryIconStyle: 'soft',
  motionLevel: 'soft',
  density: 'comfortable',
  adminThemeMode: 'follow_store',
};

/** @deprecated */
const CLASSIC_GOLD_BLACK_CONFIG = DEFAULT_LIFE_GREEN_CONFIG;

/** 仅当 site_settings 无皮肤数据时的兜底（单套） */
const FALLBACK_THEME_SKIN = {
  id: DEFAULT_SKIN_ID,
  name: '大马通默认生活服务绿',
  sceneTag: 'life_service',
  clientEnabled: true,
  config: DEFAULT_LIFE_GREEN_CONFIG,
};

/** @deprecated 请使用 FALLBACK_THEME_SKIN */
const THEME_PRESETS = [FALLBACK_THEME_SKIN];

const PROMO_SKIN_ID = 'promo_red_orange';

module.exports = {
  DEFAULT_SKIN_ID,
  DEFAULT_LIFE_GREEN_CONFIG,
  CLASSIC_GOLD_BLACK_CONFIG,
  FALLBACK_THEME_SKIN,
  THEME_PRESETS,
  PROMO_SKIN_ID,
};
