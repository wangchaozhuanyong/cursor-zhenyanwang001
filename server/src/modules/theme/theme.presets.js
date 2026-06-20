const PREMIUM_CHAMPAGNE_IVORY_SKIN_ID = 'premium_champagne_ivory';
const PREMIUM_PEARL_BLUSH_SKIN_ID = 'premium_pearl_blush';
const PREMIUM_PORCELAIN_JADE_SKIN_ID = 'premium_porcelain_jade';
const PREMIUM_SKY_SILK_SKIN_ID = 'premium_sky_silk';
const PREMIUM_APRICOT_SAND_SKIN_ID = 'premium_apricot_sand';
const CLIENT_BLUE_PORTAL_SKIN_ID = 'client_blue_portal';
const CLIENT_SKY_TECH_SKIN_ID = 'client_sky_tech';
const CLIENT_BLACK_GOLD_SKIN_ID = 'client_black_gold';
const CLIENT_DEEP_ENTERPRISE_SKIN_ID = 'client_deep_enterprise';
const FESTIVAL_SPRING_RUBY_GOLD_SKIN_ID = 'festival_spring_ruby_gold';
const FESTIVAL_MOON_ORANGE_GOLD_SKIN_ID = 'festival_moon_orange_gold';

const DEFAULT_SKIN_ID = PREMIUM_CHAMPAGNE_IVORY_SKIN_ID;
const DEFAULT_HOLIDAY_SKIN_ID = FESTIVAL_SPRING_RUBY_GOLD_SKIN_ID;

const RETIRED_SYSTEM_SKIN_IDS = new Set([
  'premium_ivory_jade',
  'default_life_green',
  'festive_ruby_gold',
  'obsidian_black_gold',
  'midnight_titanium',
  'starter_festive_ruby_gold',
  'aetherial_blanc',
  'organic_sandstone',
]);

const DAILY_COMMERCE_SKIN_ID = PREMIUM_CHAMPAGNE_IVORY_SKIN_ID;
const FESTIVAL_SKIN_ID = FESTIVAL_SPRING_RUBY_GOLD_SKIN_ID;

const STOREFRONT_THEME_DEFAULTS = {
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

const PREMIUM_CHAMPAGNE_IVORY_CONFIG = {
  skinName: '象牙曜石·臻选商城',
  bgColor: '#F6F1E8',
  surfaceColor: '#FFFDF8',
  primaryColor: '#211A14',
  secondaryColor: '#EFE6DA',
  accentColor: '#B08A45',
  priceColor: '#C2412D',
  textColor: '#211A14',
  mutedTextColor: '#6F675D',
  borderColor: '#E2D8C8',
  successColor: '#7A6230',
  warningColor: '#B0782A',
  dangerColor: '#B63A2F',
  ...STOREFRONT_THEME_DEFAULTS,
};

const PREMIUM_PEARL_BLUSH_CONFIG = {
  skinName: '珍珠玫瑰·柔奢美学',
  bgColor: '#FBF5F2',
  surfaceColor: '#FFFDFC',
  primaryColor: '#A84F5E',
  secondaryColor: '#F3E0E2',
  accentColor: '#C9906A',
  priceColor: '#B83E4B',
  textColor: '#2A1C1F',
  mutedTextColor: '#7A646B',
  borderColor: '#E9D4D5',
  successColor: '#3F8066',
  warningColor: '#B7813C',
  dangerColor: '#A93B48',
  ...STOREFRONT_THEME_DEFAULTS,
};

const PREMIUM_PORCELAIN_JADE_CONFIG = {
  skinName: '瓷白翡翠·东方高级',
  bgColor: '#F5F8F2',
  surfaceColor: '#FFFEFA',
  primaryColor: '#0C5D4B',
  secondaryColor: '#E3EEE8',
  accentColor: '#B69B5D',
  priceColor: '#C24B35',
  textColor: '#16251F',
  mutedTextColor: '#63736A',
  borderColor: '#D8E5DC',
  successColor: '#137B5D',
  warningColor: '#AA7D2A',
  dangerColor: '#B13F32',
  ...STOREFRONT_THEME_DEFAULTS,
};

const PREMIUM_SKY_SILK_CONFIG = {
  skinName: '天丝蓝白·清透科技',
  bgColor: '#F4F9FD',
  surfaceColor: '#FFFFFF',
  primaryColor: '#1E6FB3',
  secondaryColor: '#E2EEF8',
  accentColor: '#8FAFD3',
  priceColor: '#B84734',
  textColor: '#14233A',
  mutedTextColor: '#617087',
  borderColor: '#D6E5F2',
  successColor: '#237D68',
  warningColor: '#A97622',
  dangerColor: '#B94338',
  ...STOREFRONT_THEME_DEFAULTS,
};

const PREMIUM_APRICOT_SAND_CONFIG = {
  skinName: '杏桃砂岩·温暖精品',
  bgColor: '#FFF6EC',
  surfaceColor: '#FFFDFC',
  primaryColor: '#B8663C',
  secondaryColor: '#F6E4D6',
  accentColor: '#9A8463',
  priceColor: '#B84A30',
  textColor: '#2B211A',
  mutedTextColor: '#78695A',
  borderColor: '#E9D7C5',
  successColor: '#557D5E',
  warningColor: '#A9772B',
  dangerColor: '#A94734',
  ...STOREFRONT_THEME_DEFAULTS,
};

const CLIENT_BLUE_PORTAL_CONFIG = {
  skinName: '蓝白内容门户·知识商城',
  bgColor: '#F5F8FF',
  surfaceColor: '#FFFFFF',
  primaryColor: '#2563EB',
  secondaryColor: '#E8F1FF',
  accentColor: '#10B981',
  priceColor: '#D94A34',
  textColor: '#0F172A',
  mutedTextColor: '#64748B',
  borderColor: '#D9E6F7',
  successColor: '#0F8A63',
  warningColor: '#B7791F',
  dangerColor: '#C24132',
  ...STOREFRONT_THEME_DEFAULTS,
  radius: '12px',
  shadowStyle: 'subtle',
  buttonStyle: 'rounded',
  navStyle: 'clean',
  badgeStyle: 'outline',
  priceStyle: 'bold',
  productCardVariant: 'standard',
  cardStyle: 'bordered',
  cardTextAlign: 'left',
  imageRatio: '16 / 9',
  imageFit: 'cover',
  homeLayout: 'magazine',
  headerStyle: 'clean',
  bannerStyle: 'clean',
  couponStyle: 'minimal',
  memberCardStyle: 'light',
  categoryIconStyle: 'outline',
  motionLevel: 'soft',
  density: 'compact',
};

const CLIENT_SKY_TECH_CONFIG = {
  skinName: '浅蓝科技专业·高效客户端',
  bgColor: '#F7FBFF',
  surfaceColor: '#FFFFFF',
  primaryColor: '#0EA5E9',
  secondaryColor: '#E7F4FF',
  accentColor: '#1D4ED8',
  priceColor: '#C84A33',
  textColor: '#111827',
  mutedTextColor: '#64748B',
  borderColor: '#D8E7F5',
  successColor: '#0F8A63',
  warningColor: '#B7791F',
  dangerColor: '#C24132',
  ...STOREFRONT_THEME_DEFAULTS,
  radius: '12px',
  shadowStyle: 'subtle',
  buttonStyle: 'rounded',
  navStyle: 'floating',
  badgeStyle: 'soft',
  priceStyle: 'bold',
  productCardVariant: 'compact',
  cardStyle: 'minimal',
  cardTextAlign: 'left',
  imageRatio: '1 / 1',
  imageFit: 'cover',
  homeLayout: 'classic',
  headerStyle: 'premium',
  bannerStyle: 'fresh',
  couponStyle: 'minimal',
  memberCardStyle: 'fresh',
  categoryIconStyle: 'soft',
  motionLevel: 'soft',
  density: 'compact',
};

const CLIENT_BLACK_GOLD_CONFIG = {
  skinName: '黑金高端·臻选商城',
  bgColor: '#F5F5F3',
  surfaceColor: '#FFFFFF',
  primaryColor: '#D4AF37',
  secondaryColor: '#F1E8D2',
  accentColor: '#A47A22',
  priceColor: '#A47A22',
  textColor: '#1A1A1A',
  mutedTextColor: '#6F6658',
  borderColor: '#E3D9C6',
  successColor: '#69A67D',
  warningColor: '#D0A23A',
  dangerColor: '#D56A4A',
  ...STOREFRONT_THEME_DEFAULTS,
  radius: '18px',
  shadowStyle: 'glow',
  buttonStyle: 'pill',
  navStyle: 'glass',
  badgeStyle: 'solid',
  priceStyle: 'luxury',
  productCardVariant: 'premium',
  cardStyle: 'elevated',
  cardTextAlign: 'left',
  imageRatio: '4 / 5',
  imageFit: 'cover',
  homeLayout: 'premium',
  headerStyle: 'dark',
  bannerStyle: 'dark',
  couponStyle: 'premium',
  memberCardStyle: 'blackGold',
  categoryIconStyle: 'solid',
  motionLevel: 'rich',
  density: 'comfortable',
};

const CLIENT_DEEP_ENTERPRISE_CONFIG = {
  skinName: '深蓝企业系统·全站规范',
  bgColor: '#F5F8FD',
  surfaceColor: '#FFFFFF',
  primaryColor: '#1D4ED8',
  secondaryColor: '#E8EEF8',
  accentColor: '#0F766E',
  priceColor: '#C2412D',
  textColor: '#0F172A',
  mutedTextColor: '#5F6F85',
  borderColor: '#D9E3F2',
  successColor: '#0F8A63',
  warningColor: '#B7791F',
  dangerColor: '#C24132',
  ...STOREFRONT_THEME_DEFAULTS,
  radius: '10px',
  shadowStyle: 'subtle',
  buttonStyle: 'square',
  navStyle: 'clean',
  badgeStyle: 'outline',
  priceStyle: 'normal',
  productCardVariant: 'standard',
  cardStyle: 'bordered',
  cardTextAlign: 'left',
  imageRatio: '16 / 9',
  imageFit: 'cover',
  homeLayout: 'magazine',
  headerStyle: 'premium',
  bannerStyle: 'clean',
  couponStyle: 'ticket',
  memberCardStyle: 'light',
  categoryIconStyle: 'outline',
  motionLevel: 'none',
  density: 'compact',
};

const FESTIVAL_SPRING_RUBY_GOLD_CONFIG = {
  skinName: '新春红金·喜庆大促',
  bgColor: '#FFF5EC',
  surfaceColor: '#FFFCF8',
  primaryColor: '#C9202D',
  secondaryColor: '#FCE1DE',
  accentColor: '#C79A35',
  priceColor: '#C91F2E',
  textColor: '#2C1714',
  mutedTextColor: '#7D5F58',
  borderColor: '#EECAC0',
  successColor: '#257A55',
  warningColor: '#B98324',
  dangerColor: '#B91F29',
  ...STOREFRONT_THEME_DEFAULTS,
};

const FESTIVAL_MOON_ORANGE_GOLD_CONFIG = {
  skinName: '团圆橙金·节庆礼遇',
  bgColor: '#FFF7E8',
  surfaceColor: '#FFFCF6',
  primaryColor: '#D85D2A',
  secondaryColor: '#FBE5C8',
  accentColor: '#C79A3C',
  priceColor: '#C94322',
  textColor: '#2B1E12',
  mutedTextColor: '#7B6A54',
  borderColor: '#EBD4B3',
  successColor: '#467B58',
  warningColor: '#B88122',
  dangerColor: '#B13C25',
  ...STOREFRONT_THEME_DEFAULTS,
};

const PREMIUM_CHAMPAGNE_IVORY_SKIN = {
  id: PREMIUM_CHAMPAGNE_IVORY_SKIN_ID,
  name: '象牙曜石·臻选商城',
  description: '长期默认主商城皮肤。象牙浅底、曜石咖黑主色、赤陶价格强调和香槟金细节，适合长期购物平台使用，克制、高级、不抢商品图。',
  category: '高端商城',
  sceneTag: 'premium',
  config: PREMIUM_CHAMPAGNE_IVORY_CONFIG,
};

const PREMIUM_PEARL_BLUSH_SKIN = {
  id: PREMIUM_PEARL_BLUSH_SKIN_ID,
  name: '珍珠玫瑰·柔奢美学',
  description: '珍珠白、藕粉、玫瑰金组合。适合女性客群、美妆、礼品、生活方式类商品，柔和但不廉价。',
  category: '高端商城',
  sceneTag: 'premium',
  config: PREMIUM_PEARL_BLUSH_CONFIG,
};

const PREMIUM_PORCELAIN_JADE_SKIN = {
  id: PREMIUM_PORCELAIN_JADE_SKIN_ID,
  name: '瓷白翡翠·东方高级',
  description: '瓷白底、信翠绿主色、淡金细节。适合综合商城、精品商城和长期运营页面，清爽、有质感、不压商品图。',
  category: '高端商城',
  sceneTag: 'premium',
  config: PREMIUM_PORCELAIN_JADE_CONFIG,
};

const PREMIUM_SKY_SILK_SKIN = {
  id: PREMIUM_SKY_SILK_SKIN_ID,
  name: '天丝蓝白·清透科技',
  description: '浅蓝白、银蓝和淡金点缀。适合数码、服务、跨境购物、平台型商城，视觉清透、专业、现代。',
  category: '日常商城',
  sceneTag: 'mall',
  config: PREMIUM_SKY_SILK_CONFIG,
};

const PREMIUM_APRICOT_SAND_SKIN = {
  id: PREMIUM_APRICOT_SAND_SKIN_ID,
  name: '杏桃砂岩·温暖精品',
  description: '奶油白、杏桃橙、砂岩米色组合。适合日用品、母婴、家居、礼品类商城，温暖、有亲和力，也保持高级感。',
  category: '日常商城',
  sceneTag: 'mall',
  config: PREMIUM_APRICOT_SAND_CONFIG,
};

const CLIENT_BLUE_PORTAL_SKIN = {
  id: CLIENT_BLUE_PORTAL_SKIN_ID,
  name: '蓝白内容门户',
  description: '大面积留白、蓝色导航、内容平台式卡片与清晰信息层级，适合知识型商城和综合客户端。',
  category: '客户端重构',
  sceneTag: 'mall',
  config: CLIENT_BLUE_PORTAL_CONFIG,
};

const CLIENT_SKY_TECH_SKIN = {
  id: CLIENT_SKY_TECH_SKIN_ID,
  name: '浅蓝科技专业',
  description: '浅蓝科技感、干净高效、桌面和移动端都偏专业工具型，作为新版客户端默认风格。',
  category: '客户端重构',
  sceneTag: 'mall',
  config: CLIENT_SKY_TECH_CONFIG,
};

const CLIENT_BLACK_GOLD_SKIN = {
  id: CLIENT_BLACK_GOLD_SKIN_ID,
  name: '黑金高端',
  description: '黑金强调、精品卡片和高端会员质感，适合臻选、礼赠、精品商城。',
  category: '客户端重构',
  sceneTag: 'premium',
  config: CLIENT_BLACK_GOLD_CONFIG,
};

const CLIENT_DEEP_ENTERPRISE_SKIN = {
  id: CLIENT_DEEP_ENTERPRISE_SKIN_ID,
  name: '深蓝企业系统',
  description: '深蓝企业级秩序、方正组件和紧凑密度，适合签证留学、B2B 服务和规范型客户端。',
  category: '客户端重构',
  sceneTag: 'visa',
  config: CLIENT_DEEP_ENTERPRISE_CONFIG,
};

const FESTIVAL_SPRING_RUBY_GOLD_SKIN = {
  id: FESTIVAL_SPRING_RUBY_GOLD_SKIN_ID,
  name: '新春红金·喜庆大促',
  description: '节日皮肤 1。暖白底、正红主色、鎏金点缀，适合春节、新年、双11、双12、年终礼遇等促销节日，喜庆但不刺眼。',
  category: '节日活动',
  sceneTag: 'holiday',
  config: FESTIVAL_SPRING_RUBY_GOLD_CONFIG,
};

const FESTIVAL_MOON_ORANGE_GOLD_SKIN = {
  id: FESTIVAL_MOON_ORANGE_GOLD_SKIN_ID,
  name: '团圆橙金·节庆礼遇',
  description: '节日皮肤 2。月光米白、吉祥橙红、柔金点缀，适合中秋、国庆、开斋节、屠妖节、周年庆等喜庆活动，氛围明亮、温暖、礼赠感强。',
  category: '节日活动',
  sceneTag: 'holiday',
  config: FESTIVAL_MOON_ORANGE_GOLD_CONFIG,
};

const DEFAULT_LIFE_GREEN_CONFIG = PREMIUM_CHAMPAGNE_IVORY_CONFIG;
const FESTIVAL_RUBY_GOLD_CONFIG = FESTIVAL_SPRING_RUBY_GOLD_CONFIG;
const PREMIUM_IVORY_JADE_CONFIG = PREMIUM_CHAMPAGNE_IVORY_CONFIG;
const DAILY_COMMERCE_SKIN = PREMIUM_CHAMPAGNE_IVORY_SKIN;
const FESTIVAL_RUBY_GOLD_SKIN = FESTIVAL_SPRING_RUBY_GOLD_SKIN;
const PREMIUM_IVORY_JADE_SKIN = PREMIUM_CHAMPAGNE_IVORY_SKIN;

const DEFAULT_THEME_HOLIDAY_RULES = [
  { id: 'cn_my_new_year', name: '元旦 / 新年档（中国 1月1-3日，马来西亚 1月1日）', enabled: true, start: '01-01', end: '01-03', skinId: FESTIVAL_SKIN_ID },
  { id: 'cn_spring_festival_2026', name: '春节档（中国公共假期 2026）', enabled: true, start: '02-15', end: '02-23', skinId: FESTIVAL_SKIN_ID },
  { id: 'my_cny_2026', name: '马来西亚农历新年（2026）', enabled: true, start: '02-17', end: '02-18', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_0303', name: '3.3 购物节', enabled: true, start: '03-01', end: '03-03', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_0308', name: '3.8 女王节 / 女神节', enabled: true, start: '03-04', end: '03-08', skinId: FESTIVAL_SKIN_ID },
  { id: 'my_hari_raya_2026', name: '开斋节档（马来西亚公共假期 2026）', enabled: true, start: '03-21', end: '03-23', skinId: FESTIVAL_SKIN_ID },
  { id: 'cn_qingming_2026', name: '清明节（中国公共假期 2026）', enabled: true, start: '04-04', end: '04-06', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_0404', name: '4.4 购物节', enabled: true, start: '04-01', end: '04-04', skinId: FESTIVAL_SKIN_ID },
  { id: 'cn_my_labour_day', name: '劳动节档（中国 5月1-5日，马来西亚 5月1日）', enabled: true, start: '05-01', end: '05-05', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_0505', name: '5.5 购物节', enabled: true, start: '05-01', end: '05-05', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_0520', name: '520 礼遇购物节', enabled: true, start: '05-18', end: '05-20', skinId: FESTIVAL_SKIN_ID },
  { id: 'my_hari_raya_haji_2026', name: '哈芝节（马来西亚公共假期 2026）', enabled: true, start: '05-27', end: '05-27', skinId: FESTIVAL_SKIN_ID },
  { id: 'my_wesak_2026', name: '卫塞节（马来西亚公共假期 2026）', enabled: true, start: '05-31', end: '05-31', skinId: FESTIVAL_SKIN_ID },
  { id: 'my_agong_birthday_2026', name: '国家元首诞辰（马来西亚公共假期 2026）', enabled: true, start: '06-01', end: '06-01', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_0606', name: '6.6 购物节', enabled: true, start: '06-01', end: '06-06', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_0618', name: '618 年中大促', enabled: true, start: '06-10', end: '06-18', skinId: FESTIVAL_SKIN_ID },
  { id: 'my_awal_muharram_2026', name: '回历新年（马来西亚公共假期 2026）', enabled: true, start: '06-17', end: '06-17', skinId: FESTIVAL_SKIN_ID },
  { id: 'cn_dragon_boat_2026', name: '端午节（中国公共假期 2026）', enabled: true, start: '06-19', end: '06-21', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_0707', name: '7.7 购物节', enabled: true, start: '07-01', end: '07-07', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_0808', name: '8.8 购物节', enabled: true, start: '08-01', end: '08-08', skinId: FESTIVAL_SKIN_ID },
  { id: 'my_maulidur_rasul_2026', name: '先知诞辰（马来西亚公共假期 2026）', enabled: true, start: '08-25', end: '08-25', skinId: FESTIVAL_SKIN_ID },
  { id: 'my_merdeka', name: '马来西亚国庆档（8月31日公共假期）', enabled: true, start: '08-29', end: '09-01', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_0909', name: '9.9 购物节', enabled: true, start: '09-01', end: '09-09', skinId: FESTIVAL_SKIN_ID },
  { id: 'my_malaysia_day', name: '马来西亚日', enabled: true, start: '09-16', end: '09-16', skinId: FESTIVAL_SKIN_ID },
  { id: 'cn_mid_autumn_2026', name: '中秋节（中国公共假期 2026）', enabled: true, start: '09-25', end: '09-27', skinId: FESTIVAL_SKIN_ID },
  { id: 'cn_national_day_2026', name: '中国国庆黄金周（2026）', enabled: true, start: '10-01', end: '10-07', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_1010', name: '10.10 购物节', enabled: true, start: '10-01', end: '10-10', skinId: FESTIVAL_SKIN_ID },
  { id: 'my_deepavali_2026', name: '屠妖节（马来西亚公共假期 2026）', enabled: true, start: '11-08', end: '11-09', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_1111', name: '双11 全球购物节', enabled: true, start: '11-01', end: '11-12', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_black_friday_2026', name: '黑五 / Cyber Monday（2026）', enabled: true, start: '11-27', end: '12-01', skinId: FESTIVAL_SKIN_ID },
  { id: 'shopping_1212', name: '双12 年终购物节', enabled: true, start: '12-01', end: '12-13', skinId: FESTIVAL_SKIN_ID },
  { id: 'christmas_year_end', name: '圣诞 / 年末礼遇', enabled: true, start: '12-20', end: '12-27', skinId: FESTIVAL_SKIN_ID },
];

const FALLBACK_THEME_SKIN = PREMIUM_CHAMPAGNE_IVORY_SKIN;
const THEME_PRESETS = [
  PREMIUM_CHAMPAGNE_IVORY_SKIN,
  CLIENT_BLUE_PORTAL_SKIN,
  CLIENT_SKY_TECH_SKIN,
  CLIENT_BLACK_GOLD_SKIN,
  CLIENT_DEEP_ENTERPRISE_SKIN,
  PREMIUM_PEARL_BLUSH_SKIN,
  PREMIUM_PORCELAIN_JADE_SKIN,
  PREMIUM_SKY_SILK_SKIN,
  PREMIUM_APRICOT_SAND_SKIN,
  FESTIVAL_SPRING_RUBY_GOLD_SKIN,
  FESTIVAL_MOON_ORANGE_GOLD_SKIN,
];

module.exports = {
  DEFAULT_SKIN_ID,
  DEFAULT_HOLIDAY_SKIN_ID,
  DAILY_COMMERCE_SKIN_ID,
  FESTIVAL_SKIN_ID,
  PREMIUM_CHAMPAGNE_IVORY_SKIN_ID,
  PREMIUM_PEARL_BLUSH_SKIN_ID,
  PREMIUM_PORCELAIN_JADE_SKIN_ID,
  PREMIUM_SKY_SILK_SKIN_ID,
  PREMIUM_APRICOT_SAND_SKIN_ID,
  CLIENT_BLUE_PORTAL_SKIN_ID,
  CLIENT_SKY_TECH_SKIN_ID,
  CLIENT_BLACK_GOLD_SKIN_ID,
  CLIENT_DEEP_ENTERPRISE_SKIN_ID,
  FESTIVAL_SPRING_RUBY_GOLD_SKIN_ID,
  FESTIVAL_MOON_ORANGE_GOLD_SKIN_ID,
  RETIRED_SYSTEM_SKIN_IDS,
  DEFAULT_THEME_HOLIDAY_RULES,
  STOREFRONT_THEME_DEFAULTS,
  DEFAULT_LIFE_GREEN_CONFIG,
  FESTIVAL_RUBY_GOLD_CONFIG,
  PREMIUM_IVORY_JADE_CONFIG,
  PREMIUM_CHAMPAGNE_IVORY_CONFIG,
  PREMIUM_PEARL_BLUSH_CONFIG,
  PREMIUM_PORCELAIN_JADE_CONFIG,
  PREMIUM_SKY_SILK_CONFIG,
  PREMIUM_APRICOT_SAND_CONFIG,
  CLIENT_BLUE_PORTAL_CONFIG,
  CLIENT_SKY_TECH_CONFIG,
  CLIENT_BLACK_GOLD_CONFIG,
  CLIENT_DEEP_ENTERPRISE_CONFIG,
  FESTIVAL_SPRING_RUBY_GOLD_CONFIG,
  FESTIVAL_MOON_ORANGE_GOLD_CONFIG,
  DAILY_COMMERCE_SKIN,
  FESTIVAL_RUBY_GOLD_SKIN,
  PREMIUM_IVORY_JADE_SKIN,
  PREMIUM_CHAMPAGNE_IVORY_SKIN,
  PREMIUM_PEARL_BLUSH_SKIN,
  PREMIUM_PORCELAIN_JADE_SKIN,
  PREMIUM_SKY_SILK_SKIN,
  PREMIUM_APRICOT_SAND_SKIN,
  CLIENT_BLUE_PORTAL_SKIN,
  CLIENT_SKY_TECH_SKIN,
  CLIENT_BLACK_GOLD_SKIN,
  CLIENT_DEEP_ENTERPRISE_SKIN,
  FESTIVAL_SPRING_RUBY_GOLD_SKIN,
  FESTIVAL_MOON_ORANGE_GOLD_SKIN,
  FALLBACK_THEME_SKIN,
  THEME_PRESETS,
};
