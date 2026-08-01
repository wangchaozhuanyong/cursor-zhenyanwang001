const { DEFAULT_THEME_CONFIG } = require('./theme.default');

const FIXED_THEME_ID = 'city-goods-fixed';
const FIXED_THEME_CONFIG = {
  ...DEFAULT_THEME_CONFIG,
  skinName: '城市好物',
  bgColor: '#FFFDF9',
  surfaceColor: '#FFFFFF',
  primaryColor: '#284D3E',
  secondaryColor: '#F2F4F1',
  accentColor: '#96733A',
  priceColor: '#B13C2E',
  borderColor: '#E8E2DA',
  textColor: '#17201B',
  mutedTextColor: '#6E716F',
  successColor: '#17603F',
  warningColor: '#96733A',
  dangerColor: '#B13C2E',
  radius: '8px',
  buttonStyle: 'square',
  navStyle: 'clean',
  badgeStyle: 'outline',
  priceStyle: 'tabularBold',
  productCardVariant: 'editorial',
  cardStyle: 'minimal',
  cardTextAlign: 'left',
  imageRatio: '1 / 1',
  imageFit: 'contain',
  homeLayout: 'magazine',
  headerStyle: 'transparent',
  bannerStyle: 'naturalWindow',
  couponStyle: 'minimal',
  memberCardStyle: 'jadeGold',
  categoryIconStyle: 'outline',
  motionLevel: 'soft',
  density: 'compact',
  adminThemeMode: 'fixed',
};

const FIXED_THEME_PAYLOAD = {
  defaultSkinId: FIXED_THEME_ID,
  activeSkinId: FIXED_THEME_ID,
  runtimeSkinId: FIXED_THEME_ID,
  holidaySkinId: FIXED_THEME_ID,
  holidayRules: [],
  skins: [{
    id: FIXED_THEME_ID,
    themeKey: FIXED_THEME_ID,
    name: '城市好物',
    description: '固定客户端设计兼容数据。',
    category: '固定设计',
    type: 'evergreen',
    status: 'published',
    isDefault: true,
    config: FIXED_THEME_CONFIG,
  }],
};

module.exports = {
  FIXED_THEME_ID,
  FIXED_THEME_CONFIG,
  FIXED_THEME_PAYLOAD,
};
