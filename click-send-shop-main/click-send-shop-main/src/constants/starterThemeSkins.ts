import type { ThemeConfig, ThemeSkin } from "@/types/theme";

export const VIBRANT_SUNSET_CORAL_SKIN_ID = "vibrant_sunset_coral";

/** 活力满分·日落珊瑚 — 好物商城推荐皮肤 */
export const VIBRANT_SUNSET_CORAL_CONFIG: ThemeConfig = {
  skinName: "日落珊瑚",
  radius: "16px",
  fontFamily: "inter",
  bgColor: "#F8F9FA",
  surfaceColor: "#FFFFFF",
  primaryColor: "#E63946",
  secondaryColor: "#FDEBEC",
  accentColor: "#FFB703",
  priceColor: "#D90429",
  textColor: "#2B2D42",
  mutedTextColor: "#8D99AE",
  borderColor: "#EDF2F4",
  successColor: "#2A9D8F",
  warningColor: "#F4A261",
  dangerColor: "#E63946",
  shadowStyle: "soft",
  buttonStyle: "pill",
  navStyle: "glass",
  badgeStyle: "soft",
  priceStyle: "bold",
  productCardVariant: "standard",
  cardStyle: "seamless",
  cardTextAlign: "left",
  imageRatio: "4 / 5",
  imageFit: "cover",
  homeLayout: "classic",
  headerStyle: "transparent",
  bannerStyle: "fresh",
  couponStyle: "premium",
  memberCardStyle: "blackGold",
  categoryIconStyle: "soft",
  motionLevel: "rich",
  density: "comfortable",
  adminThemeMode: "follow_store",
};

export const VIBRANT_SUNSET_CORAL_SKIN: ThemeSkin = {
  id: VIBRANT_SUNSET_CORAL_SKIN_ID,
  name: "活力满分·日落珊瑚",
  description:
    "充满活力与现代呼吸感的暖色调皮肤。通过高对比度的珊瑚红主色刺激转化，配合毛玻璃与大圆角设计，适合面向年轻客群的全品类好物商城。",
  sceneTag: "mall",
  clientEnabled: true,
  config: VIBRANT_SUNSET_CORAL_CONFIG,
};

/** 管理后台可一键添加的推荐皮肤（非兜底，需用户主动添加或迁移写入） */
export const HAUTE_BLANC_SKIN_ID = "haute_blanc";

/** 大马通·高定流白 — 深色商品图 + 画廊风中性留白 */
export const HAUTE_BLANC_CONFIG: ThemeConfig = {
  skinName: "高定流白",
  radius: "4px",
  fontFamily: "outfit",
  bgColor: "#FAFAFA",
  surfaceColor: "#FFFFFF",
  primaryColor: "#111111",
  secondaryColor: "#F0F0F0",
  accentColor: "#D4CFC7",
  priceColor: "#000000",
  textColor: "#1A1A1A",
  mutedTextColor: "#767676",
  borderColor: "#EAEAEA",
  successColor: "#507A57",
  warningColor: "#B8860B",
  dangerColor: "#8A2E2E",
  shadowStyle: "none",
  buttonStyle: "square",
  navStyle: "clean",
  badgeStyle: "outline",
  priceStyle: "luxury",
  productCardVariant: "premium",
  cardStyle: "seamless",
  cardTextAlign: "center",
  imageRatio: "1 / 1",
  imageFit: "cover",
  homeLayout: "premium",
  headerStyle: "clean",
  bannerStyle: "clean",
  couponStyle: "minimal",
  memberCardStyle: "light",
  categoryIconStyle: "outline",
  motionLevel: "soft",
  density: "comfortable",
  adminThemeMode: "follow_store",
};

export const HAUTE_BLANC_SKIN: ThemeSkin = {
  id: HAUTE_BLANC_SKIN_ID,
  name: "大马通·高定流白",
  description:
    "专为深色背景商品图打造的高级画廊风。采用极致的黑白灰中性色调、无阴影设计与大面积留白，剥离一切干扰元素的视觉噪音，呈现顶级品牌质感。",
  sceneTag: "premium",
  clientEnabled: true,
  config: HAUTE_BLANC_CONFIG,
};

export const GALLERY_MINIMAL_SKIN_ID = "gallery_minimal";

/** 极简美学·画廊叙事 — 纯白底 + 直角 + 杂志布局 */
export const GALLERY_MINIMAL_CONFIG: ThemeConfig = {
  skinName: "极简画廊白",
  radius: "0px",
  fontFamily: "outfit",
  bgColor: "#FFFFFF",
  surfaceColor: "#FFFFFF",
  primaryColor: "#111111",
  secondaryColor: "#F2F2F2",
  accentColor: "#8C8C8C",
  priceColor: "#000000",
  textColor: "#1A1A1A",
  mutedTextColor: "#737373",
  borderColor: "#E5E5E5",
  successColor: "#4A5D4E",
  warningColor: "#8B7355",
  dangerColor: "#803E3E",
  shadowStyle: "none",
  buttonStyle: "square",
  navStyle: "clean",
  badgeStyle: "outline",
  priceStyle: "luxury",
  productCardVariant: "premium",
  cardStyle: "minimal",
  cardTextAlign: "center",
  imageRatio: "1 / 1",
  imageFit: "cover",
  homeLayout: "magazine",
  headerStyle: "clean",
  bannerStyle: "clean",
  couponStyle: "minimal",
  memberCardStyle: "light",
  categoryIconStyle: "outline",
  motionLevel: "soft",
  density: "comfortable",
  adminThemeMode: "fixed",
};

export const GALLERY_MINIMAL_SKIN: ThemeSkin = {
  id: GALLERY_MINIMAL_SKIN_ID,
  name: "极简美学·画廊叙事",
  description:
    "专为深色商品图打造的「画廊级」展示空间。采用极致克制的黑白灰中性色调、锐利的直角边缘与无阴影设计，通过大量留白烘托商品本身的高级感与品质感。",
  sceneTag: "premium",
  clientEnabled: true,
  config: GALLERY_MINIMAL_CONFIG,
};

export const OBSIDIAN_BLACK_GOLD_SKIN_ID = "obsidian_black_gold";

/** 曜石黑金·尊享大马通 — 极暗画布 + 黑金描边商品卡 */
export const OBSIDIAN_BLACK_GOLD_CONFIG: ThemeConfig = {
  skinName: "曜石黑金",
  radius: "8px",
  fontFamily: "inter",
  bgColor: "#050505",
  surfaceColor: "#141414",
  primaryColor: "#D4AF37",
  secondaryColor: "#262626",
  accentColor: "#E8C872",
  priceColor: "#E0B94B",
  textColor: "#F0F0F0",
  mutedTextColor: "#808080",
  borderColor: "#2A2A2A",
  successColor: "#34D399",
  warningColor: "#FBBF24",
  dangerColor: "#F87171",
  shadowStyle: "glow",
  buttonStyle: "rounded",
  navStyle: "glass",
  badgeStyle: "outline",
  priceStyle: "luxury",
  productCardVariant: "premium",
  cardStyle: "bordered",
  cardTextAlign: "left",
  imageRatio: "1 / 1",
  imageFit: "cover",
  homeLayout: "premium",
  headerStyle: "dark",
  bannerStyle: "dark",
  couponStyle: "premium",
  memberCardStyle: "blackGold",
  categoryIconStyle: "outline",
  motionLevel: "soft",
  density: "comfortable",
  adminThemeMode: "fixed",
};

export const OBSIDIAN_BLACK_GOLD_SKIN: ThemeSkin = {
  id: OBSIDIAN_BLACK_GOLD_SKIN_ID,
  name: "曜石黑金·尊享大马通",
  description:
    "专为「大马通」主站设计的高端深色皮肤。通过纯黑背景、极细边框与黑金配色，完美分割并衬托深色背景的商品图，主页「新品上市」模块展现奢华画廊质感。",
  sceneTag: "premium",
  clientEnabled: true,
  config: OBSIDIAN_BLACK_GOLD_CONFIG,
};

export const MIDNIGHT_TITANIUM_SKIN_ID = "midnight_titanium";

/** 幻夜钛银·大马通 — 冷调灰蓝 + 钛银 + 悬浮 elevated 商品卡 */
export const MIDNIGHT_TITANIUM_CONFIG: ThemeConfig = {
  skinName: "幻夜钛银",
  radius: "16px",
  fontFamily: "space",
  bgColor: "#0F141E",
  surfaceColor: "#1C2433",
  primaryColor: "#E2E8F0",
  secondaryColor: "#2C3647",
  accentColor: "#818CF8",
  priceColor: "#FFFFFF",
  textColor: "#F8FAFC",
  mutedTextColor: "#94A3B8",
  borderColor: "#2A3441",
  successColor: "#34D399",
  warningColor: "#FBBF24",
  dangerColor: "#F87171",
  shadowStyle: "soft",
  buttonStyle: "pill",
  navStyle: "floating",
  badgeStyle: "solid",
  priceStyle: "normal",
  productCardVariant: "standard",
  cardStyle: "elevated",
  cardTextAlign: "left",
  imageRatio: "3 / 4",
  imageFit: "cover",
  homeLayout: "classic",
  headerStyle: "transparent",
  bannerStyle: "dark",
  couponStyle: "minimal",
  memberCardStyle: "light",
  categoryIconStyle: "soft",
  motionLevel: "rich",
  density: "comfortable",
  adminThemeMode: "fixed",
};

export const MIDNIGHT_TITANIUM_SKIN: ThemeSkin = {
  id: MIDNIGHT_TITANIUM_SKIN_ID,
  name: "幻夜钛银·大马通",
  description:
    "告别传统的纯黑，采用深邃的冷调灰蓝与钛银交织。通过冷色调的悬浮卡片自然托起深色商品图，呈现极简、冷峻的先锋高级感，是大马通主页新品上市的绝佳秀场。",
  sceneTag: "premium",
  clientEnabled: true,
  config: MIDNIGHT_TITANIUM_CONFIG,
};

export const FESTIVE_RUBY_GOLD_SKIN_ID = "festive_ruby_gold";

/** 大马通限定·瑞红鎏金 — 节日大促浅色皮肤 */
export const FESTIVE_RUBY_GOLD_CONFIG: ThemeConfig = {
  skinName: "瑞红鎏金",
  radius: "12px",
  fontFamily: "inter",
  bgColor: "#FDFBF7",
  surfaceColor: "#FFFFFF",
  primaryColor: "#D92332",
  secondaryColor: "#FFF0F1",
  accentColor: "#D4AF37",
  priceColor: "#C91826",
  textColor: "#2C2626",
  mutedTextColor: "#8C8585",
  borderColor: "#F0EBE1",
  successColor: "#2A8B5F",
  warningColor: "#E59819",
  dangerColor: "#D92332",
  shadowStyle: "soft",
  buttonStyle: "pill",
  navStyle: "floating",
  badgeStyle: "solid",
  priceStyle: "luxury",
  productCardVariant: "deal",
  cardStyle: "elevated",
  cardTextAlign: "left",
  imageRatio: "1 / 1",
  imageFit: "cover",
  homeLayout: "deal",
  headerStyle: "clean",
  bannerStyle: "deal",
  couponStyle: "premium",
  memberCardStyle: "gold",
  categoryIconStyle: "circle",
  motionLevel: "rich",
  density: "compact",
  adminThemeMode: "fixed",
};

export const FESTIVE_RUBY_GOLD_SKIN: ThemeSkin = {
  id: FESTIVE_RUBY_GOLD_SKIN_ID,
  name: "大马通限定·瑞红鎏金",
  description:
    "专为节日大促定制的高级浅色皮肤。以象牙暖白为底色，红宝石色为促销主心骨，辅以鎏金质感。在热烈喜庆的氛围中，完美包容并衬托深色商品图，主打「高定礼盒」般的奢华购物体验。",
  sceneTag: "promotion",
  clientEnabled: true,
  config: FESTIVE_RUBY_GOLD_CONFIG,
};

export const AETHERIAL_BLANC_SKIN_ID = "aetherial_blanc";

/** 无界谧白·空间建构 — 建筑留白 + 孔雀石绿 + 杂志布局 */
export const AETHERIAL_BLANC_CONFIG: ThemeConfig = {
  skinName: "无界谧白",
  radius: "16px",
  fontFamily: "outfit",
  bgColor: "#F4F5F7",
  surfaceColor: "#FFFFFF",
  primaryColor: "#004B35",
  secondaryColor: "#E5EBE9",
  accentColor: "#1A1D20",
  priceColor: "#0C0D0F",
  textColor: "#1A1D20",
  mutedTextColor: "#848B93",
  borderColor: "#EBECEF",
  successColor: "#218A62",
  warningColor: "#D49A36",
  dangerColor: "#C73E47",
  shadowStyle: "subtle",
  buttonStyle: "rounded",
  navStyle: "glass",
  badgeStyle: "outline",
  priceStyle: "luxury",
  productCardVariant: "premium",
  cardStyle: "seamless",
  cardTextAlign: "left",
  imageRatio: "1 / 1",
  imageFit: "contain",
  homeLayout: "magazine",
  headerStyle: "transparent",
  bannerStyle: "clean",
  couponStyle: "minimal",
  memberCardStyle: "blackGold",
  categoryIconStyle: "soft",
  motionLevel: "rich",
  density: "comfortable",
  adminThemeMode: "follow_store",
};

export const AETHERIAL_BLANC_SKIN: ThemeSkin = {
  id: AETHERIAL_BLANC_SKIN_ID,
  name: "无界谧白·空间建构",
  description:
    "摒弃一切多余装饰的终极形态。以建筑学级别的空间留白和极具呼吸感的排版，配合深孔雀石绿的主色调，为深色商品图打造出如同高定时装秀场般的「新品上市」展示空间。",
  sceneTag: "premium",
  clientEnabled: true,
  config: AETHERIAL_BLANC_CONFIG,
};

export const ORGANIC_SANDSTONE_SKIN_ID = "organic_sandstone";

/** 质朴之境·原生砂岩 — 燕麦大地色 + 衬线字体 + seamless 静物展台 */
export const ORGANIC_SANDSTONE_CONFIG: ThemeConfig = {
  skinName: "质朴砂岩",
  radius: "12px",
  fontFamily: "fraunces",
  bgColor: "#F5F2EB",
  surfaceColor: "#FCFBF8",
  primaryColor: "#8C6B4A",
  secondaryColor: "#E6E1D6",
  accentColor: "#596854",
  priceColor: "#3E3128",
  textColor: "#2C241B",
  mutedTextColor: "#8B8276",
  borderColor: "#E3DAC9",
  successColor: "#6B7F5C",
  warningColor: "#D4A373",
  dangerColor: "#A35D4F",
  shadowStyle: "soft",
  buttonStyle: "pill",
  navStyle: "floating",
  badgeStyle: "outline",
  priceStyle: "luxury",
  productCardVariant: "standard",
  cardStyle: "seamless",
  cardTextAlign: "center",
  imageRatio: "4 / 5",
  imageFit: "cover",
  homeLayout: "magazine",
  headerStyle: "clean",
  bannerStyle: "fresh",
  couponStyle: "minimal",
  memberCardStyle: "blackGold",
  categoryIconStyle: "soft",
  motionLevel: "soft",
  density: "comfortable",
  adminThemeMode: "follow_store",
};

export const ORGANIC_SANDSTONE_SKIN: ThemeSkin = {
  id: ORGANIC_SANDSTONE_SKIN_ID,
  name: "质朴之境·原生砂岩",
  description:
    "摒弃工业感，回归感官质朴。以燕麦色与砂岩灰为主基调，利用柔和的大地色系托起深色背景的商品图，营造出顶级生活方式品牌独有的温润、高级与松弛感。",
  sceneTag: "premium",
  clientEnabled: true,
  config: ORGANIC_SANDSTONE_CONFIG,
};

export const STARTER_THEME_SKINS: ThemeSkin[] = [
  VIBRANT_SUNSET_CORAL_SKIN,
  HAUTE_BLANC_SKIN,
  GALLERY_MINIMAL_SKIN,
  OBSIDIAN_BLACK_GOLD_SKIN,
  MIDNIGHT_TITANIUM_SKIN,
  FESTIVE_RUBY_GOLD_SKIN,
  AETHERIAL_BLANC_SKIN,
  ORGANIC_SANDSTONE_SKIN,
];

export const STARTER_THEME_SKIN_MAP = new Map(STARTER_THEME_SKINS.map((s) => [s.id, s]));
