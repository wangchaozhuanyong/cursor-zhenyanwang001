const VIBRANT_SUNSET_CORAL_SKIN_ID = 'vibrant_sunset_coral';

const VIBRANT_SUNSET_CORAL_CONFIG = {
  skinName: '日落珊瑚',
  radius: '16px',
  fontFamily: 'inter',
  bgColor: '#F8F9FA',
  surfaceColor: '#FFFFFF',
  primaryColor: '#E63946',
  secondaryColor: '#FDEBEC',
  accentColor: '#FFB703',
  priceColor: '#D90429',
  textColor: '#2B2D42',
  mutedTextColor: '#8D99AE',
  borderColor: '#EDF2F4',
  successColor: '#2A9D8F',
  warningColor: '#F4A261',
  dangerColor: '#E63946',
  shadowStyle: 'soft',
  buttonStyle: 'pill',
  navStyle: 'glass',
  badgeStyle: 'soft',
  priceStyle: 'bold',
  productCardVariant: 'standard',
  cardStyle: 'seamless',
  cardTextAlign: 'left',
  imageRatio: '4 / 5',
  imageFit: 'cover',
  homeLayout: 'classic',
  headerStyle: 'transparent',
  bannerStyle: 'fresh',
  couponStyle: 'premium',
  memberCardStyle: 'blackGold',
  categoryIconStyle: 'soft',
  motionLevel: 'rich',
  density: 'comfortable',
  adminThemeMode: 'follow_store',
};

const VIBRANT_SUNSET_CORAL_SKIN = {
  id: VIBRANT_SUNSET_CORAL_SKIN_ID,
  name: '活力满分·日落珊瑚',
  description:
    '充满活力与现代呼吸感的暖色调皮肤。通过高对比度的珊瑚红主色刺激转化，配合毛玻璃与大圆角设计，适合面向年轻客群的全品类好物商城。',
  sceneTag: 'mall',
  clientEnabled: true,
  config: VIBRANT_SUNSET_CORAL_CONFIG,
};

const HAUTE_BLANC_SKIN_ID = 'haute_blanc';

const HAUTE_BLANC_CONFIG = {
  skinName: '高定流白',
  radius: '4px',
  fontFamily: 'outfit',
  bgColor: '#FAFAFA',
  surfaceColor: '#FFFFFF',
  primaryColor: '#111111',
  secondaryColor: '#F0F0F0',
  accentColor: '#D4CFC7',
  priceColor: '#000000',
  textColor: '#1A1A1A',
  mutedTextColor: '#767676',
  borderColor: '#EAEAEA',
  successColor: '#507A57',
  warningColor: '#B8860B',
  dangerColor: '#8A2E2E',
  shadowStyle: 'none',
  buttonStyle: 'square',
  navStyle: 'clean',
  badgeStyle: 'outline',
  priceStyle: 'luxury',
  productCardVariant: 'premium',
  cardStyle: 'seamless',
  cardTextAlign: 'center',
  imageRatio: '1 / 1',
  imageFit: 'cover',
  homeLayout: 'premium',
  headerStyle: 'clean',
  bannerStyle: 'clean',
  couponStyle: 'minimal',
  memberCardStyle: 'light',
  categoryIconStyle: 'outline',
  motionLevel: 'soft',
  density: 'comfortable',
  adminThemeMode: 'follow_store',
};

const HAUTE_BLANC_SKIN = {
  id: HAUTE_BLANC_SKIN_ID,
  name: '大马通·高定流白',
  description:
    '专为深色背景商品图打造的高级画廊风。采用极致的黑白灰中性色调、无阴影设计与大面积留白，剥离一切干扰元素的视觉噪音，呈现顶级品牌质感。',
  sceneTag: 'premium',
  clientEnabled: true,
  config: HAUTE_BLANC_CONFIG,
};

const GALLERY_MINIMAL_SKIN_ID = 'gallery_minimal';

const GALLERY_MINIMAL_CONFIG = {
  skinName: '极简画廊白',
  radius: '0px',
  fontFamily: 'outfit',
  bgColor: '#FFFFFF',
  surfaceColor: '#FFFFFF',
  primaryColor: '#111111',
  secondaryColor: '#F2F2F2',
  accentColor: '#8C8C8C',
  priceColor: '#000000',
  textColor: '#1A1A1A',
  mutedTextColor: '#737373',
  borderColor: '#E5E5E5',
  successColor: '#4A5D4E',
  warningColor: '#8B7355',
  dangerColor: '#803E3E',
  shadowStyle: 'none',
  buttonStyle: 'square',
  navStyle: 'clean',
  badgeStyle: 'outline',
  priceStyle: 'luxury',
  productCardVariant: 'premium',
  cardStyle: 'minimal',
  cardTextAlign: 'center',
  imageRatio: '1 / 1',
  imageFit: 'cover',
  homeLayout: 'magazine',
  headerStyle: 'clean',
  bannerStyle: 'clean',
  couponStyle: 'minimal',
  memberCardStyle: 'light',
  categoryIconStyle: 'outline',
  motionLevel: 'soft',
  density: 'comfortable',
  adminThemeMode: 'fixed',
};

const GALLERY_MINIMAL_SKIN = {
  id: GALLERY_MINIMAL_SKIN_ID,
  name: '极简美学·画廊叙事',
  description:
    '专为深色商品图打造的「画廊级」展示空间。采用极致克制的黑白灰中性色调、锐利的直角边缘与无阴影设计，通过大量留白烘托商品本身的高级感与品质感。',
  sceneTag: 'premium',
  clientEnabled: true,
  config: GALLERY_MINIMAL_CONFIG,
};

const STARTER_THEME_SKINS = [VIBRANT_SUNSET_CORAL_SKIN, HAUTE_BLANC_SKIN, GALLERY_MINIMAL_SKIN];

module.exports = {
  VIBRANT_SUNSET_CORAL_SKIN_ID,
  VIBRANT_SUNSET_CORAL_SKIN,
  HAUTE_BLANC_SKIN_ID,
  HAUTE_BLANC_SKIN,
  GALLERY_MINIMAL_SKIN_ID,
  GALLERY_MINIMAL_SKIN,
  STARTER_THEME_SKINS,
};
