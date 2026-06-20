import type { ThemeConfig, ThemeHolidayRule, ThemeSkin } from "@/types/theme";
import { STOREFRONT_THEME_DEFAULTS } from "@/constants/themeDesignLocks";

export const PREMIUM_CHAMPAGNE_IVORY_SKIN_ID = "premium_champagne_ivory";
export const PREMIUM_PEARL_BLUSH_SKIN_ID = "premium_pearl_blush";
export const PREMIUM_PORCELAIN_JADE_SKIN_ID = "premium_porcelain_jade";
export const PREMIUM_SKY_SILK_SKIN_ID = "premium_sky_silk";
export const PREMIUM_APRICOT_SAND_SKIN_ID = "premium_apricot_sand";
export const CLIENT_BLUE_PORTAL_SKIN_ID = "client_blue_portal";
export const CLIENT_SKY_TECH_SKIN_ID = "client_sky_tech";
export const CLIENT_BLACK_GOLD_SKIN_ID = "client_black_gold";
export const CLIENT_DEEP_ENTERPRISE_SKIN_ID = "client_deep_enterprise";
export const FESTIVAL_SPRING_RUBY_GOLD_SKIN_ID = "festival_spring_ruby_gold";
export const FESTIVAL_MOON_ORANGE_GOLD_SKIN_ID = "festival_moon_orange_gold";

export const DEFAULT_SKIN_ID = PREMIUM_CHAMPAGNE_IVORY_SKIN_ID;
export const DEFAULT_HOLIDAY_SKIN_ID = PREMIUM_CHAMPAGNE_IVORY_SKIN_ID;

export const RETIRED_SYSTEM_SKIN_IDS = new Set([
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
  "premium_ivory_jade",
  "default_life_green",
  "festive_ruby_gold",
  "obsidian_black_gold",
  "midnight_titanium",
  "starter_festive_ruby_gold",
  "aetherial_blanc",
  "organic_sandstone",
]);

export const DAILY_COMMERCE_SKIN_ID = PREMIUM_CHAMPAGNE_IVORY_SKIN_ID;
export const FESTIVAL_SKIN_ID = PREMIUM_CHAMPAGNE_IVORY_SKIN_ID;

export const PREMIUM_CHAMPAGNE_IVORY_CONFIG: ThemeConfig = {
  skinName: "曜石朱砂·优选商城",
  bgColor: "#F7F3EE",
  surfaceColor: "#FFFDF9",
  primaryColor: "#BE2633",
  secondaryColor: "#F3E6DD",
  accentColor: "#AD7B3A",
  priceColor: "#D84024",
  textColor: "#201A17",
  mutedTextColor: "#6F655E",
  borderColor: "#E5DAD0",
  successColor: "#2F7A56",
  warningColor: "#B7791F",
  dangerColor: "#C6282D",
  ...STOREFRONT_THEME_DEFAULTS,
  radius: "12px",
  shadowStyle: "subtle",
  buttonStyle: "rounded",
  navStyle: "clean",
  badgeStyle: "soft",
  priceStyle: "bold",
  productCardVariant: "standard",
  cardStyle: "bordered",
  cardTextAlign: "left",
  imageRatio: "1 / 1",
  imageFit: "cover",
  homeLayout: "magazine",
  headerStyle: "clean",
  bannerStyle: "dark",
  couponStyle: "deal",
  memberCardStyle: "blackGold",
  categoryIconStyle: "outline",
  motionLevel: "soft",
  density: "compact",
};

export const PREMIUM_PEARL_BLUSH_CONFIG: ThemeConfig = {
  skinName: "赤金奶油·商品转化",
  bgColor: "#F8F1EA",
  surfaceColor: "#FFFFFF",
  primaryColor: "#B52D35",
  secondaryColor: "#EDE0D9",
  accentColor: "#C49A4A",
  priceColor: "#B52D35",
  textColor: "#2A1714",
  mutedTextColor: "#765F5A",
  borderColor: "#E1D1C8",
  successColor: "#337A55",
  warningColor: "#B77A22",
  dangerColor: "#B33F35",
  ...STOREFRONT_THEME_DEFAULTS,
};

export const PREMIUM_PORCELAIN_JADE_CONFIG: ThemeConfig = {
  skinName: "鼠尾草石·自然环保",
  bgColor: "#F0EFE7",
  surfaceColor: "#FBFAF3",
  primaryColor: "#5A6F45",
  secondaryColor: "#E3E2D6",
  accentColor: "#A58F58",
  priceColor: "#B94A33",
  textColor: "#26301F",
  mutedTextColor: "#68705F",
  borderColor: "#D5D2C4",
  successColor: "#3E7D55",
  warningColor: "#AD7924",
  dangerColor: "#B13F32",
  ...STOREFRONT_THEME_DEFAULTS,
};

export const PREMIUM_SKY_SILK_CONFIG: ThemeConfig = {
  skinName: "珍珠蓝灰·现代专业",
  bgColor: "#F4F7FA",
  surfaceColor: "#FFFFFF",
  primaryColor: "#2E5F90",
  secondaryColor: "#E4EAF0",
  accentColor: "#A9955E",
  priceColor: "#B84734",
  textColor: "#172033",
  mutedTextColor: "#667183",
  borderColor: "#D6DFE7",
  successColor: "#237D68",
  warningColor: "#A97622",
  dangerColor: "#B94338",
  ...STOREFRONT_THEME_DEFAULTS,
};

export const PREMIUM_APRICOT_SAND_CONFIG: ThemeConfig = {
  skinName: "亚麻胡桃·温馨家装",
  bgColor: "#F3E7D7",
  surfaceColor: "#FFF8EF",
  primaryColor: "#8A4A31",
  secondaryColor: "#E8D6C0",
  accentColor: "#B98A49",
  priceColor: "#B84A30",
  textColor: "#2F1F16",
  mutedTextColor: "#786556",
  borderColor: "#DDC8B2",
  successColor: "#557D5E",
  warningColor: "#A9772B",
  dangerColor: "#A94734",
  ...STOREFRONT_THEME_DEFAULTS,
};

export const CLIENT_BLUE_PORTAL_CONFIG: ThemeConfig = {
  skinName: "蓝白内容门户·知识商城",
  bgColor: "#F5F8FF",
  surfaceColor: "#FFFFFF",
  primaryColor: "#2563EB",
  secondaryColor: "#E8F1FF",
  accentColor: "#10B981",
  priceColor: "#D94A34",
  textColor: "#0F172A",
  mutedTextColor: "#64748B",
  borderColor: "#D9E6F7",
  successColor: "#0F8A63",
  warningColor: "#B7791F",
  dangerColor: "#C24132",
  ...STOREFRONT_THEME_DEFAULTS,
  radius: "12px",
  shadowStyle: "subtle",
  buttonStyle: "rounded",
  navStyle: "clean",
  badgeStyle: "outline",
  priceStyle: "bold",
  productCardVariant: "standard",
  cardStyle: "bordered",
  cardTextAlign: "left",
  imageRatio: "16 / 9",
  imageFit: "cover",
  homeLayout: "magazine",
  headerStyle: "clean",
  bannerStyle: "clean",
  couponStyle: "minimal",
  memberCardStyle: "light",
  categoryIconStyle: "outline",
  motionLevel: "soft",
  density: "compact",
};

export const CLIENT_SKY_TECH_CONFIG: ThemeConfig = {
  skinName: "浅蓝科技专业·高效客户端",
  bgColor: "#F7FBFF",
  surfaceColor: "#FFFFFF",
  primaryColor: "#0EA5E9",
  secondaryColor: "#E7F4FF",
  accentColor: "#1D4ED8",
  priceColor: "#C84A33",
  textColor: "#111827",
  mutedTextColor: "#64748B",
  borderColor: "#D8E7F5",
  successColor: "#0F8A63",
  warningColor: "#B7791F",
  dangerColor: "#C24132",
  ...STOREFRONT_THEME_DEFAULTS,
  radius: "12px",
  shadowStyle: "subtle",
  buttonStyle: "rounded",
  navStyle: "floating",
  badgeStyle: "soft",
  priceStyle: "bold",
  productCardVariant: "compact",
  cardStyle: "minimal",
  cardTextAlign: "left",
  imageRatio: "1 / 1",
  imageFit: "cover",
  homeLayout: "classic",
  headerStyle: "premium",
  bannerStyle: "fresh",
  couponStyle: "minimal",
  memberCardStyle: "fresh",
  categoryIconStyle: "soft",
  motionLevel: "soft",
  density: "compact",
};

export const CLIENT_BLACK_GOLD_CONFIG: ThemeConfig = {
  skinName: "黑金高端·臻选商城",
  bgColor: "#F5F5F3",
  surfaceColor: "#FFFFFF",
  primaryColor: "#D4AF37",
  secondaryColor: "#F1E8D2",
  accentColor: "#A47A22",
  priceColor: "#A47A22",
  textColor: "#1A1A1A",
  mutedTextColor: "#6F6658",
  borderColor: "#E3D9C6",
  successColor: "#69A67D",
  warningColor: "#D0A23A",
  dangerColor: "#D56A4A",
  ...STOREFRONT_THEME_DEFAULTS,
  radius: "18px",
  shadowStyle: "glow",
  buttonStyle: "pill",
  navStyle: "glass",
  badgeStyle: "solid",
  priceStyle: "luxury",
  productCardVariant: "premium",
  cardStyle: "elevated",
  cardTextAlign: "left",
  imageRatio: "4 / 5",
  imageFit: "cover",
  homeLayout: "premium",
  headerStyle: "dark",
  bannerStyle: "dark",
  couponStyle: "premium",
  memberCardStyle: "blackGold",
  categoryIconStyle: "solid",
  motionLevel: "rich",
  density: "comfortable",
};

export const CLIENT_DEEP_ENTERPRISE_CONFIG: ThemeConfig = {
  skinName: "深蓝企业系统·全站规范",
  bgColor: "#F5F8FD",
  surfaceColor: "#FFFFFF",
  primaryColor: "#1D4ED8",
  secondaryColor: "#E8EEF8",
  accentColor: "#0F766E",
  priceColor: "#C2412D",
  textColor: "#0F172A",
  mutedTextColor: "#5F6F85",
  borderColor: "#D9E3F2",
  successColor: "#0F8A63",
  warningColor: "#B7791F",
  dangerColor: "#C24132",
  ...STOREFRONT_THEME_DEFAULTS,
  radius: "10px",
  shadowStyle: "subtle",
  buttonStyle: "square",
  navStyle: "clean",
  badgeStyle: "outline",
  priceStyle: "normal",
  productCardVariant: "standard",
  cardStyle: "bordered",
  cardTextAlign: "left",
  imageRatio: "16 / 9",
  imageFit: "cover",
  homeLayout: "magazine",
  headerStyle: "premium",
  bannerStyle: "clean",
  couponStyle: "ticket",
  memberCardStyle: "light",
  categoryIconStyle: "outline",
  motionLevel: "none",
  density: "compact",
};

export const FESTIVAL_SPRING_RUBY_GOLD_CONFIG: ThemeConfig = {
  skinName: "新春红金·喜庆大促",
  bgColor: "#FFF5EC",
  surfaceColor: "#FFFCF8",
  primaryColor: "#C9202D",
  secondaryColor: "#FCE1DE",
  accentColor: "#C79A35",
  priceColor: "#C91F2E",
  textColor: "#2C1714",
  mutedTextColor: "#7D5F58",
  borderColor: "#EECAC0",
  successColor: "#257A55",
  warningColor: "#B98324",
  dangerColor: "#B91F29",
  ...STOREFRONT_THEME_DEFAULTS,
};

export const FESTIVAL_MOON_ORANGE_GOLD_CONFIG: ThemeConfig = {
  skinName: "团圆橙金·节庆礼遇",
  bgColor: "#FFF7E8",
  surfaceColor: "#FFFCF6",
  primaryColor: "#D85D2A",
  secondaryColor: "#FBE5C8",
  accentColor: "#C79A3C",
  priceColor: "#C94322",
  textColor: "#2B1E12",
  mutedTextColor: "#7B6A54",
  borderColor: "#EBD4B3",
  successColor: "#467B58",
  warningColor: "#B88122",
  dangerColor: "#B13C25",
  ...STOREFRONT_THEME_DEFAULTS,
};

export const PREMIUM_CHAMPAGNE_IVORY_SKIN: ThemeSkin = {
  id: PREMIUM_CHAMPAGNE_IVORY_SKIN_ID,
  name: "曜石朱砂",
  description: "默认主商城皮肤。浅暖灰页面底、瓷白商品面、朱砂交易色、琥珀细节和墨色文字，适合长期购物平台使用，清楚、耐看、有转化感。",
  category: "高端商城",
  sceneTag: "mall",
  config: PREMIUM_CHAMPAGNE_IVORY_CONFIG,
};

export const PREMIUM_PEARL_BLUSH_SKIN: ThemeSkin = {
  id: PREMIUM_PEARL_BLUSH_SKIN_ID,
  name: "赤金奶油",
  description: "商品转化风。奶油浅底、赤金按钮和红色价格强调，适合材料商城、购买页、优惠活动。",
  category: "高端商城",
  sceneTag: "premium",
  config: PREMIUM_PEARL_BLUSH_CONFIG,
};

export const PREMIUM_PORCELAIN_JADE_SKIN: ThemeSkin = {
  id: PREMIUM_PORCELAIN_JADE_SKIN_ID,
  name: "鼠尾草石",
  description: "自然环保风。鼠尾草绿、石色浅底和柔金细节，适合环保材料、原木风、侘寂风空间。",
  category: "高端商城",
  sceneTag: "premium",
  config: PREMIUM_PORCELAIN_JADE_CONFIG,
};

export const PREMIUM_SKY_SILK_SKIN: ThemeSkin = {
  id: PREMIUM_SKY_SILK_SKIN_ID,
  name: "珍珠蓝灰",
  description: "现代专业风。珍珠白、蓝灰主色和克制金色点缀，适合办公室、商业空间、工程装修。",
  category: "日常商城",
  sceneTag: "mall",
  config: PREMIUM_SKY_SILK_CONFIG,
};

export const PREMIUM_APRICOT_SAND_SKIN: ThemeSkin = {
  id: PREMIUM_APRICOT_SAND_SKIN_ID,
  name: "亚麻胡桃",
  description: "温馨家装风。亚麻浅底、胡桃木主色和柔金细节，适合家庭装修、软装、木质空间。",
  category: "日常商城",
  sceneTag: "mall",
  config: PREMIUM_APRICOT_SAND_CONFIG,
};

export const CLIENT_BLUE_PORTAL_SKIN: ThemeSkin = {
  id: CLIENT_BLUE_PORTAL_SKIN_ID,
  name: "蓝白内容门户",
  description: "参考 1111。大面积留白、蓝色导航、内容平台式卡片与清晰信息层级，适合知识型商城和综合客户端。",
  category: "客户端重构",
  sceneTag: "mall",
  config: CLIENT_BLUE_PORTAL_CONFIG,
};

export const CLIENT_SKY_TECH_SKIN: ThemeSkin = {
  id: CLIENT_SKY_TECH_SKIN_ID,
  name: "浅蓝科技专业",
  description: "参考 444。浅蓝科技感、干净高效、桌面和移动端都偏专业工具型，作为新版客户端默认风格。",
  category: "客户端重构",
  sceneTag: "mall",
  config: CLIENT_SKY_TECH_CONFIG,
};

export const CLIENT_BLACK_GOLD_SKIN: ThemeSkin = {
  id: CLIENT_BLACK_GOLD_SKIN_ID,
  name: "黑金高端",
  description: "参考 222。黑金高端生活方式视觉，强调质感、价格价值感和高客单商品浏览体验。",
  category: "客户端重构",
  sceneTag: "premium",
  config: CLIENT_BLACK_GOLD_CONFIG,
};

export const CLIENT_DEEP_ENTERPRISE_SKIN: ThemeSkin = {
  id: CLIENT_DEEP_ENTERPRISE_SKIN_ID,
  name: "深蓝企业系统",
  description: "参考 333。深蓝企业级规范、蓝白内容页面和系统化组件节奏，适合可信、专业、全站式客户端。",
  category: "客户端重构",
  sceneTag: "visa",
  config: CLIENT_DEEP_ENTERPRISE_CONFIG,
};

export const FESTIVAL_SPRING_RUBY_GOLD_SKIN: ThemeSkin = {
  id: FESTIVAL_SPRING_RUBY_GOLD_SKIN_ID,
  name: "新春红金·喜庆大促",
  description: "节日皮肤 1。暖白底、正红主色、鎏金点缀，适合春节、新年、双11、双12、年终礼遇等促销节日，喜庆但不刺眼。",
  category: "节日活动",
  sceneTag: "holiday",
  config: FESTIVAL_SPRING_RUBY_GOLD_CONFIG,
};

export const FESTIVAL_MOON_ORANGE_GOLD_SKIN: ThemeSkin = {
  id: FESTIVAL_MOON_ORANGE_GOLD_SKIN_ID,
  name: "团圆橙金·节庆礼遇",
  description: "节日皮肤 2。月光米白、吉祥橙红、柔金点缀，适合中秋、国庆、开斋节、屠妖节、周年庆等喜庆活动，氛围明亮、温暖、礼赠感强。",
  category: "节日活动",
  sceneTag: "holiday",
  config: FESTIVAL_MOON_ORANGE_GOLD_CONFIG,
};

export const DEFAULT_LIFE_GREEN_CONFIG = PREMIUM_CHAMPAGNE_IVORY_CONFIG;
export const PREMIUM_IVORY_JADE_CONFIG = PREMIUM_CHAMPAGNE_IVORY_CONFIG;
export const DAILY_COMMERCE_SKIN = PREMIUM_CHAMPAGNE_IVORY_SKIN;
export const FESTIVAL_RUBY_GOLD_SKIN = FESTIVAL_SPRING_RUBY_GOLD_SKIN;
export const PREMIUM_IVORY_JADE_SKIN = PREMIUM_CHAMPAGNE_IVORY_SKIN;

export const FALLBACK_THEME_SKIN = PREMIUM_CHAMPAGNE_IVORY_SKIN;
export const THEME_PRESETS: ThemeSkin[] = [
  PREMIUM_CHAMPAGNE_IVORY_SKIN,
];

export const DEFAULT_THEME_HOLIDAY_RULES: ThemeHolidayRule[] = [
  { id: "cn_my_new_year", name: "元旦 / 新年档（中国 1月1-3日，马来西亚 1月1日）", enabled: true, start: "01-01", end: "01-03", skinId: FESTIVAL_SKIN_ID },
  { id: "cn_spring_festival_2026", name: "春节档（中国公共假期 2026）", enabled: true, start: "02-15", end: "02-23", skinId: FESTIVAL_SKIN_ID },
  { id: "my_cny_2026", name: "马来西亚农历新年（2026）", enabled: true, start: "02-17", end: "02-18", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_0303", name: "3.3 购物节", enabled: true, start: "03-01", end: "03-03", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_0308", name: "3.8 女王节 / 女神节", enabled: true, start: "03-04", end: "03-08", skinId: FESTIVAL_SKIN_ID },
  { id: "my_hari_raya_2026", name: "开斋节档（马来西亚公共假期 2026）", enabled: true, start: "03-21", end: "03-23", skinId: FESTIVAL_SKIN_ID },
  { id: "cn_qingming_2026", name: "清明节（中国公共假期 2026）", enabled: true, start: "04-04", end: "04-06", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_0404", name: "4.4 购物节", enabled: true, start: "04-01", end: "04-04", skinId: FESTIVAL_SKIN_ID },
  { id: "cn_my_labour_day", name: "劳动节档（中国 5月1-5日，马来西亚 5月1日）", enabled: true, start: "05-01", end: "05-05", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_0505", name: "5.5 购物节", enabled: true, start: "05-01", end: "05-05", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_0520", name: "520 礼遇购物节", enabled: true, start: "05-18", end: "05-20", skinId: FESTIVAL_SKIN_ID },
  { id: "my_hari_raya_haji_2026", name: "哈芝节（马来西亚公共假期 2026）", enabled: true, start: "05-27", end: "05-27", skinId: FESTIVAL_SKIN_ID },
  { id: "my_wesak_2026", name: "卫塞节（马来西亚公共假期 2026）", enabled: true, start: "05-31", end: "05-31", skinId: FESTIVAL_SKIN_ID },
  { id: "my_agong_birthday_2026", name: "国家元首诞辰（马来西亚公共假期 2026）", enabled: true, start: "06-01", end: "06-01", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_0606", name: "6.6 购物节", enabled: true, start: "06-01", end: "06-06", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_0618", name: "618 年中大促", enabled: true, start: "06-10", end: "06-18", skinId: FESTIVAL_SKIN_ID },
  { id: "my_awal_muharram_2026", name: "回历新年（马来西亚公共假期 2026）", enabled: true, start: "06-17", end: "06-17", skinId: FESTIVAL_SKIN_ID },
  { id: "cn_dragon_boat_2026", name: "端午节（中国公共假期 2026）", enabled: true, start: "06-19", end: "06-21", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_0707", name: "7.7 购物节", enabled: true, start: "07-01", end: "07-07", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_0808", name: "8.8 购物节", enabled: true, start: "08-01", end: "08-08", skinId: FESTIVAL_SKIN_ID },
  { id: "my_maulidur_rasul_2026", name: "先知诞辰（马来西亚公共假期 2026）", enabled: true, start: "08-25", end: "08-25", skinId: FESTIVAL_SKIN_ID },
  { id: "my_merdeka", name: "马来西亚国庆档（8月31日公共假期）", enabled: true, start: "08-29", end: "09-01", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_0909", name: "9.9 购物节", enabled: true, start: "09-01", end: "09-09", skinId: FESTIVAL_SKIN_ID },
  { id: "my_malaysia_day", name: "马来西亚日", enabled: true, start: "09-16", end: "09-16", skinId: FESTIVAL_SKIN_ID },
  { id: "cn_mid_autumn_2026", name: "中秋节（中国公共假期 2026）", enabled: true, start: "09-25", end: "09-27", skinId: FESTIVAL_SKIN_ID },
  { id: "cn_national_day_2026", name: "中国国庆黄金周（2026）", enabled: true, start: "10-01", end: "10-07", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_1010", name: "10.10 购物节", enabled: true, start: "10-01", end: "10-10", skinId: FESTIVAL_SKIN_ID },
  { id: "my_deepavali_2026", name: "屠妖节（马来西亚公共假期 2026）", enabled: true, start: "11-08", end: "11-09", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_1111", name: "双11 全球购物节", enabled: true, start: "11-01", end: "11-12", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_black_friday_2026", name: "黑五 / Cyber Monday（2026）", enabled: true, start: "11-27", end: "12-01", skinId: FESTIVAL_SKIN_ID },
  { id: "shopping_1212", name: "双12 年终购物节", enabled: true, start: "12-01", end: "12-13", skinId: FESTIVAL_SKIN_ID },
  { id: "christmas_year_end", name: "圣诞 / 年末礼遇", enabled: true, start: "12-20", end: "12-27", skinId: FESTIVAL_SKIN_ID },
];

export const PROMO_ADMIN_BG_OVERRIDES: Pick<ThemeConfig, "bgColor" | "surfaceColor" | "borderColor"> = {
  bgColor: "#F5F7FA",
  surfaceColor: "#FFFFFF",
  borderColor: "#E5E7EB",
};

export const ADMIN_SAFE_THEME_OVERRIDES: Pick<
  ThemeConfig,
  | "bgColor"
  | "surfaceColor"
  | "borderColor"
  | "textColor"
  | "mutedTextColor"
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "priceColor"
> = {
  bgColor: "#F5F7FA",
  surfaceColor: "#FFFFFF",
  borderColor: "#E5E7EB",
  textColor: "#333333",
  mutedTextColor: "#888888",
  primaryColor: "#00B14F",
  secondaryColor: "#E0F5E9",
  accentColor: "#FFC107",
  priceColor: "#FF5722",
};
