const DEFAULT_SKIN_ID = 'classic_gold_black';

const CLASSIC_GOLD_BLACK_CONFIG = {
  skinName: '经典金黑',
  bgColor: '#F7F2EA',
  surfaceColor: '#FFFFFF',
  primaryColor: '#17130E',
  secondaryColor: '#C89B3C',
  accentColor: '#F3D77B',
  priceColor: '#B83220',
  textColor: '#1C1712',
  mutedTextColor: '#7A6C5D',
  borderColor: '#E8DED0',
  successColor: '#2F855A',
  warningColor: '#D97706',
  dangerColor: '#B83220',
  radius: '18px',
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  shadowStyle: 'soft',
  buttonStyle: 'pill',
  navStyle: 'floating',
  badgeStyle: 'soft',
  priceStyle: 'bold',
  productCardVariant: 'premium',
  cardStyle: 'elevated',
  cardTextAlign: 'left',
  imageRatio: '1 / 1',
  imageFit: 'cover',
  homeLayout: 'premium',
  headerStyle: 'premium',
  bannerStyle: 'premium',
  couponStyle: 'premium',
  memberCardStyle: 'blackGold',
  categoryIconStyle: 'soft',
  motionLevel: 'soft',
  density: 'comfortable',
  adminThemeMode: 'fixed',
};

const THEME_PRESETS = [
  { id: 'classic_gold_black', name: '经典金黑', config: CLASSIC_GOLD_BLACK_CONFIG },
  {
    id: 'warm_light_luxury',
    name: '暖白轻奢',
    config: { ...CLASSIC_GOLD_BLACK_CONFIG, skinName: '暖白轻奢', bgColor: '#FAF7F1', surfaceColor: '#FFFDF8', primaryColor: '#6B4E2E', secondaryColor: '#D9B56B', accentColor: '#F6E8C8', priceColor: '#C24A2A', textColor: '#2A2118', mutedTextColor: '#8A7A68', borderColor: '#EEE3D1', successColor: '#3F7D4C', warningColor: '#C7831F', dangerColor: '#C24A2A', radius: '20px', shadowStyle: 'subtle', buttonStyle: 'rounded', navStyle: 'clean', priceStyle: 'normal', productCardVariant: 'standard', cardStyle: 'bordered', homeLayout: 'classic', headerStyle: 'clean', bannerStyle: 'clean', couponStyle: 'minimal', memberCardStyle: 'gold' },
  },
  {
    id: 'promo_orange_red',
    name: '活动促销',
    config: { ...CLASSIC_GOLD_BLACK_CONFIG, skinName: '活动促销', bgColor: '#FFF6F0', primaryColor: '#E63B22', secondaryColor: '#FF8A00', accentColor: '#FFE0C2', priceColor: '#E60012', textColor: '#24130E', mutedTextColor: '#8C5A48', borderColor: '#FFD8C8', successColor: '#16A34A', warningColor: '#F59E0B', dangerColor: '#E60012', radius: '14px', shadowStyle: 'medium', badgeStyle: 'solid', productCardVariant: 'deal', homeLayout: 'deal', bannerStyle: 'deal', couponStyle: 'deal', memberCardStyle: 'gold', categoryIconStyle: 'solid', motionLevel: 'rich', density: 'compact' },
  },
  {
    id: 'dark_black_gold',
    name: '深色高级',
    config: { ...CLASSIC_GOLD_BLACK_CONFIG, skinName: '深色高级', bgColor: '#0C0B09', surfaceColor: '#191714', primaryColor: '#F4E7C1', secondaryColor: '#CDAA5A', accentColor: '#E8CC7A', priceColor: '#FFCB65', textColor: '#F7EFD9', mutedTextColor: '#A99B7A', borderColor: '#332D22', successColor: '#8FD19E', warningColor: '#F5C76B', dangerColor: '#FF8A7A', shadowStyle: 'glow', navStyle: 'glass', badgeStyle: 'outline', priceStyle: 'luxury', homeLayout: 'magazine', headerStyle: 'dark', bannerStyle: 'dark', memberCardStyle: 'blackGold', categoryIconStyle: 'outline' },
  },
  {
    id: 'fresh_teal_life',
    name: '清爽蓝绿',
    config: { ...CLASSIC_GOLD_BLACK_CONFIG, skinName: '清爽蓝绿', bgColor: '#EFFAF7', primaryColor: '#0B8F8A', secondaryColor: '#75C7B8', accentColor: '#DDF5EF', priceColor: '#E15B4B', textColor: '#173B3A', mutedTextColor: '#66817E', borderColor: '#D3EEE9', successColor: '#0E9F6E', warningColor: '#D99A20', dangerColor: '#E15B4B', radius: '16px', shadowStyle: 'subtle', buttonStyle: 'rounded', navStyle: 'clean', priceStyle: 'normal', productCardVariant: 'standard', cardStyle: 'bordered', homeLayout: 'classic', headerStyle: 'clean', bannerStyle: 'fresh', couponStyle: 'minimal', memberCardStyle: 'fresh', categoryIconStyle: 'circle' },
  },
];

module.exports = {
  DEFAULT_SKIN_ID,
  CLASSIC_GOLD_BLACK_CONFIG,
  THEME_PRESETS,
};
