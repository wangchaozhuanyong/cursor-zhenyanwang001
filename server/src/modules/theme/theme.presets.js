const DAILY_COMMERCE_SKIN_ID = 'default_life_green';
const FESTIVAL_SKIN_ID = 'festive_ruby_gold';
const PREMIUM_IVORY_JADE_SKIN_ID = 'premium_ivory_jade';
const DEFAULT_SKIN_ID = PREMIUM_IVORY_JADE_SKIN_ID;
const STARTER_THEME_SKINS = require('../../../../click-send-shop-main/click-send-shop-main/src/constants/starterThemeSkins.data.json');

const STARTER_BY_ID = new Map(STARTER_THEME_SKINS.map((skin) => [skin.id, skin]));
const OBSIDIAN_BLACK_GOLD_SKIN_ID = 'obsidian_black_gold';
const MIDNIGHT_TITANIUM_SKIN_ID = 'midnight_titanium';
const STARTER_FESTIVE_RUBY_GOLD_SKIN_ID = 'starter_festive_ruby_gold';
const AETHERIAL_BLANC_SKIN_ID = 'aetherial_blanc';
const ORGANIC_SANDSTONE_SKIN_ID = 'organic_sandstone';

function starterPreset(id, overrides = {}) {
  const skin = /** @type {any} */ (STARTER_BY_ID.get(id));
  if (!skin) {
    throw new Error(`Missing starter theme skin: ${id}`);
  }
  return {
    ...skin,
    category: skin.category || '推荐皮肤',
    ...overrides,
    config: {
      ...skin.config,
      ...(overrides.config || {}),
    },
  };
}

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

const PREMIUM_IVORY_JADE_CONFIG = {
  skinName: '象牙翡翠高端皮肤',
  bgColor: '#F7F4EC',
  surfaceColor: '#FFFFFF',
  primaryColor: '#0F5F4C',
  secondaryColor: '#EAF1E9',
  accentColor: '#C6A15B',
  priceColor: '#D84B32',
  textColor: '#1F2723',
  mutedTextColor: '#6F7B73',
  borderColor: '#E3DDD0',
  successColor: '#168A62',
  warningColor: '#C0902E',
  dangerColor: '#C74332',
  ...STOREFRONT_DESIGN_LOCKS,
};

const DAILY_COMMERCE_SKIN = {
  id: DAILY_COMMERCE_SKIN_ID,
  name: '日常购物皮肤',
  description: '全年默认使用的高级商城皮肤：象牙白底、孔雀石绿品牌色、香槟金细节和朱砂红价格，干净、整齐、耐看，适合日常购物转化。',
  category: '日常商城',
  sceneTag: 'mall',
  config: DEFAULT_LIFE_GREEN_CONFIG,
};

const FESTIVAL_RUBY_GOLD_SKIN = {
  id: FESTIVAL_SKIN_ID,
  name: '节日促销皮肤',
  description: '适合节日和大促自动启用，暖白底配红金点缀，有氛围但不刺眼。',
  category: '节日活动',
  sceneTag: 'holiday',
  config: FESTIVAL_RUBY_GOLD_CONFIG,
};

const PREMIUM_IVORY_JADE_SKIN = {
  id: PREMIUM_IVORY_JADE_SKIN_ID,
  name: '象牙翡翠高端皮肤',
  description: '适合大马通日常商城长期使用的高端浅色皮肤：象牙白底、翡翠绿品牌主色、香槟金细节和珊瑚朱砂价格色，整体干净、精致、有质感但不压暗图片。',
  category: '高端商城',
  sceneTag: 'premium',
  config: PREMIUM_IVORY_JADE_CONFIG,
};

const OBSIDIAN_BLACK_GOLD_SKIN = starterPreset(OBSIDIAN_BLACK_GOLD_SKIN_ID);
const MIDNIGHT_TITANIUM_SKIN = starterPreset(MIDNIGHT_TITANIUM_SKIN_ID);
const STARTER_FESTIVE_RUBY_GOLD_SKIN = starterPreset(FESTIVAL_SKIN_ID, {
  id: STARTER_FESTIVE_RUBY_GOLD_SKIN_ID,
});
const AETHERIAL_BLANC_SKIN = starterPreset(AETHERIAL_BLANC_SKIN_ID);
const ORGANIC_SANDSTONE_SKIN = starterPreset(ORGANIC_SANDSTONE_SKIN_ID);

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

const FALLBACK_THEME_SKIN = PREMIUM_IVORY_JADE_SKIN;
const THEME_PRESETS = [
  PREMIUM_IVORY_JADE_SKIN,
  DAILY_COMMERCE_SKIN,
  FESTIVAL_RUBY_GOLD_SKIN,
  OBSIDIAN_BLACK_GOLD_SKIN,
  MIDNIGHT_TITANIUM_SKIN,
  STARTER_FESTIVE_RUBY_GOLD_SKIN,
  AETHERIAL_BLANC_SKIN,
  ORGANIC_SANDSTONE_SKIN,
];
const DEFAULT_HOLIDAY_SKIN_ID = FESTIVAL_SKIN_ID;

module.exports = {
  DEFAULT_SKIN_ID,
  DAILY_COMMERCE_SKIN_ID,
  FESTIVAL_SKIN_ID,
  PREMIUM_IVORY_JADE_SKIN_ID,
  OBSIDIAN_BLACK_GOLD_SKIN_ID,
  MIDNIGHT_TITANIUM_SKIN_ID,
  STARTER_FESTIVE_RUBY_GOLD_SKIN_ID,
  AETHERIAL_BLANC_SKIN_ID,
  ORGANIC_SANDSTONE_SKIN_ID,
  DEFAULT_HOLIDAY_SKIN_ID,
  DEFAULT_THEME_HOLIDAY_RULES,
  STOREFRONT_DESIGN_LOCKS,
  DEFAULT_LIFE_GREEN_CONFIG,
  FESTIVAL_RUBY_GOLD_CONFIG,
  PREMIUM_IVORY_JADE_CONFIG,
  DAILY_COMMERCE_SKIN,
  FESTIVAL_RUBY_GOLD_SKIN,
  PREMIUM_IVORY_JADE_SKIN,
  OBSIDIAN_BLACK_GOLD_SKIN,
  MIDNIGHT_TITANIUM_SKIN,
  STARTER_FESTIVE_RUBY_GOLD_SKIN,
  AETHERIAL_BLANC_SKIN,
  ORGANIC_SANDSTONE_SKIN,
  FALLBACK_THEME_SKIN,
  THEME_PRESETS,
};
