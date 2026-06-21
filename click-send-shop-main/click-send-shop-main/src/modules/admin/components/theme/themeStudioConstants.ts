import type { ThemeConfig, ThemeSceneTag } from "@/types/theme";

export type PreviewRouteMode =
  | "home"
  | "category"
  | "product"
  | "cart"
  | "profile"
  | "admin_home"
  | "admin_products"
  | "admin_orders";
export type PreviewMode = PreviewRouteMode | "admin" | "components" | "mobile";
export type PreviewDevice = "phone" | "tablet" | "desktop";
export type FullscreenPreviewMode = PreviewRouteMode;

export const PREVIEW_MODE_LABELS: Record<PreviewMode, string> = {
  home: "前台首页",
  category: "分类页",
  product: "商品详情",
  cart: "购物车",
  profile: "我的页面",
  admin_home: "后台首页",
  admin_products: "后台商品",
  admin_orders: "后台订单",
  admin: "后台管理",
  components: "组件库",
  mobile: "移动端",
};

export const PREVIEW_DEVICE_LABELS: Record<PreviewDevice, string> = {
  phone: "手机",
  tablet: "平板",
  desktop: "桌面",
};

export const DEVICE_WIDTH: Record<PreviewDevice, number | "100%"> = {
  phone: 390,
  tablet: 768,
  desktop: "100%",
};

export const PREVIEW_ROUTE_SCENES: Array<{
  id: PreviewRouteMode;
  label: string;
  group: "store" | "admin";
}> = [
  { id: "home", label: "前台首页", group: "store" },
  { id: "category", label: "分类页", group: "store" },
  { id: "product", label: "商品详情", group: "store" },
  { id: "cart", label: "购物车", group: "store" },
  { id: "profile", label: "我的页面", group: "store" },
  { id: "admin_home", label: "后台首页", group: "admin" },
  { id: "admin_products", label: "后台商品", group: "admin" },
  { id: "admin_orders", label: "后台订单", group: "admin" },
];

export const SCENE_FILTER_OPTIONS: Array<{ id: "all" | ThemeSceneTag; label: string }> = [
  { id: "all", label: "全部" },
  { id: "default", label: "默认" },
  { id: "life_service", label: "生活服务" },
  { id: "premium", label: "高端服务" },
  { id: "visa", label: "签证留学" },
  { id: "mall", label: "好物商城" },
  { id: "admin", label: "后台管理" },
  { id: "promotion", label: "促销活动" },
  { id: "holiday", label: "节日皮肤" },
];

export const SCENE_TAG_LABELS: Record<ThemeSceneTag, string> = {
  default: "默认",
  life_service: "生活服务",
  premium: "高端服务",
  visa: "签证留学",
  mall: "好物商城",
  admin: "后台管理",
  promotion: "促销活动",
  holiday: "节日皮肤",
};

export const enumValueLabels: Record<string, string> = {
  none: "无",
  subtle: "轻微",
  soft: "柔和",
  medium: "中等",
  glow: "发光",
  aerial: "悬浮轻影",
  paper: "纸张层影",
  velvet: "丝绒柔影",
  lantern: "灯笼暖影",
  moonlight: "月光柔影",
  pill: "胶囊",
  capsule: "细长胶囊",
  rounded: "圆角",
  square: "方角",
  clean: "简洁",
  floating: "悬浮",
  glass: "玻璃",
  glassLine: "玻璃细线",
  solid: "实心",
  outline: "描边",
  technical: "技术标签",
  botanical: "植物线标",
  jewel: "珠宝轮廓",
  festivalSeal: "节日印章",
  normal: "常规",
  bold: "加粗",
  luxury: "高级",
  tabularBold: "表格粗体",
  standard: "标准",
  premium: "高级",
  deal: "促销",
  compact: "紧凑",
  spec: "规格展示",
  editorial: "编辑排版",
  lookbook: "造型画册",
  giftSet: "礼盒套装",
  pairedGift: "成对礼赠",
  bordered: "描边",
  seamless: "无缝",
  elevated: "悬浮",
  minimal: "极简",
  glassBordered: "玻璃描边",
  paperLayered: "纸张层叠",
  framelessFloat: "无框浮层",
  silkBordered: "丝锦描边",
  moonHaloBordered: "月晕描边",
  left: "左对齐",
  center: "居中",
  cover: "裁切铺满",
  contain: "完整显示",
  classic: "经典",
  magazine: "杂志",
  modularShowcase: "模块橱窗",
  courtyardMasonry: "庭院瀑布流",
  runwayEditorial: "秀场编辑",
  festivalScroll: "节日卷轴",
  lunarGarden: "月下花园",
  transparent: "透明",
  dark: "深色",
  floatingGlass: "悬浮玻璃",
  splitEditorial: "左右编辑",
  minimalCentered: "居中极简",
  redLine: "红线节庆",
  quietLine: "静线月色",
  panoramicLight: "明亮全景",
  naturalWindow: "自然窗景",
  archedMirror: "拱形镜廊",
  lightLacquer: "浅漆礼幕",
  moonHalo: "月晕",
  ticket: "券样式",
  precisionVoucher: "精密券",
  perforatedTicket: "打孔票券",
  silkRibbon: "丝带券",
  redPacket: "红包券",
  moonTicket: "月票券",
  light: "浅色",
  gold: "金色",
  blackGold: "黑金",
  fresh: "清新",
  titaniumBlue: "钛蓝",
  walnutCopper: "胡桃铜",
  plumSilver: "梅紫银",
  jadeGold: "玉金",
  indigoGold: "靛蓝金",
  circle: "圆形",
  monoGlyph: "单线符号",
  botanicalLine: "植物线稿",
  jewelOutline: "珠宝描线",
  auspiciousSeal: "吉祥印章",
  lunarSeal: "月相印章",
  rich: "丰富",
  comfortable: "舒适",
  airy: "留白",
  follow_store: "跟随前台",
  fixed: "固定",
  springFestival: "春节",
  midAutumn: "中秋",
  manual: "手动",
  manualOrLunarSchedule: "手动或农历排期",
  solar: "公历",
  lunar: "农历",
  quiet: "安静",
  balanced: "平衡",
};

export const enumOptions = {
  shadowStyle: ["none", "subtle", "soft", "medium", "glow", "aerial", "paper", "velvet", "lantern", "moonlight"] as const,
  buttonStyle: ["pill", "capsule", "rounded", "square"] as const,
  navStyle: ["clean", "floating", "glass", "glassLine"] as const,
  badgeStyle: ["solid", "soft", "outline", "technical", "botanical", "jewel", "festivalSeal"] as const,
  priceStyle: ["normal", "bold", "luxury", "tabularBold"] as const,
  productCardVariant: ["standard", "premium", "deal", "compact", "spec", "editorial", "lookbook", "giftSet", "pairedGift"] as const,
  cardStyle: ["bordered", "seamless", "elevated", "minimal", "glassBordered", "paperLayered", "framelessFloat", "silkBordered", "moonHaloBordered"] as const,
  cardTextAlign: ["left", "center"] as const,
  imageRatio: ["1 / 1", "4 / 5", "3 / 4", "4 / 3", "16 / 9"] as const,
  imageFit: ["cover", "contain"] as const,
  homeLayout: ["classic", "premium", "deal", "magazine", "modularShowcase", "courtyardMasonry", "runwayEditorial", "festivalScroll", "lunarGarden"] as const,
  headerStyle: ["clean", "premium", "transparent", "dark", "floatingGlass", "splitEditorial", "minimalCentered", "redLine", "quietLine"] as const,
  bannerStyle: ["clean", "premium", "deal", "dark", "fresh", "panoramicLight", "naturalWindow", "archedMirror", "lightLacquer", "moonHalo"] as const,
  couponStyle: ["ticket", "premium", "deal", "minimal", "precisionVoucher", "perforatedTicket", "silkRibbon", "redPacket", "moonTicket"] as const,
  memberCardStyle: ["light", "gold", "blackGold", "fresh", "titaniumBlue", "walnutCopper", "plumSilver", "jadeGold", "indigoGold"] as const,
  categoryIconStyle: ["circle", "soft", "solid", "outline", "monoGlyph", "botanicalLine", "jewelOutline", "auspiciousSeal", "lunarSeal"] as const,
  motionLevel: ["none", "soft", "rich"] as const,
  density: ["comfortable", "compact", "airy"] as const,
  adminThemeMode: ["fixed"] as const,
};

export type ColorFieldKey = keyof Pick<
  ThemeConfig,
  | "bgColor"
  | "surfaceColor"
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "priceColor"
  | "textColor"
  | "mutedTextColor"
  | "borderColor"
  | "successColor"
  | "warningColor"
  | "dangerColor"
>;

export const COLOR_FIELD_META: Record<
  ColorFieldKey,
  { label: string; hint: string; contrastBg?: "bg" | "surface" | "primary" | "danger" }
> = {
  primaryColor: { label: "主色", hint: "主要按钮、导航选中、关键强调。", contrastBg: "primary" },
  secondaryColor: { label: "辅色", hint: "次级按钮、标签底、区块强调。", contrastBg: "bg" },
  accentColor: { label: "强调色", hint: "高亮点缀、活动角标、视觉焦点。", contrastBg: "bg" },
  priceColor: { label: "价格色", hint: "商品价格、优惠金额等商业信息。", contrastBg: "surface" },
  bgColor: { label: "页面背景", hint: "全站页面主背景色。", contrastBg: "bg" },
  surfaceColor: { label: "卡片背景", hint: "卡片、弹层、输入框背景。", contrastBg: "surface" },
  borderColor: { label: "边框色", hint: "卡片边框、分割线、输入框轮廓。", contrastBg: "bg" },
  textColor: { label: "正文色", hint: "标题和正文主文字。", contrastBg: "bg" },
  mutedTextColor: { label: "次文字色", hint: "说明、时间、辅助信息文字。", contrastBg: "bg" },
  successColor: { label: "成功色", hint: "成功状态、通过、完成。", contrastBg: "bg" },
  warningColor: { label: "警告色", hint: "提醒、待处理、库存预警。", contrastBg: "bg" },
  dangerColor: { label: "危险色", hint: "删除、失败、风险提示。", contrastBg: "danger" },
};

export const EDITOR_GROUP_IDS = [
  "basic",
  "colors",
  "text",
  "status",
  "buttons",
  "card",
  "marketing",
  "advanced",
  "health",
] as const;

export type EditorGroupId = (typeof EDITOR_GROUP_IDS)[number];

export const EDITOR_GROUP_LABELS: Record<EditorGroupId, string> = {
  basic: "基础",
  colors: "品牌与页面颜色",
  text: "文字与边框",
  status: "状态颜色",
  buttons: "组件",
  card: "商品卡",
  marketing: "首页模块",
  advanced: "高级",
  health: "健康检查",
};

export const EDITOR_TABS = [
  { id: "basic", label: "基础" },
  { id: "colors", label: "颜色" },
  { id: "components", label: "组件" },
  { id: "product", label: "商品卡" },
  { id: "home", label: "首页模块" },
  { id: "texture", label: "质感" },
  { id: "festival", label: "节日" },
  { id: "admin", label: "后台策略" },
  { id: "advanced", label: "高级" },
] as const;

export type EditorTabId = (typeof EDITOR_TABS)[number]["id"];

export const FIELD_HELP_TEXTS: Record<string, string> = {
  primaryColor: "用于主按钮、导航激活态等高频交互元素。",
  secondaryColor: "用于次级按钮、标签底色、浅色信息块。",
  accentColor: "用于运营活动、角标和小范围高亮。",
  priceColor: "用于价格、折扣、优惠金额等商业重点信息。",
  bgColor: "页面底色，影响全局背景。",
  surfaceColor: "卡片/弹层/输入框背景色。",
  textColor: "主文本颜色，建议保证高可读性。",
  mutedTextColor: "次级说明文本颜色。",
  borderColor: "边框和分割线颜色。",
  successColor: "成功态颜色。",
  warningColor: "警告态颜色。",
  dangerColor: "危险态颜色。",
  buttonStyle: "按钮整体外观。",
  navStyle: "底部导航样式。",
  radius: "全局圆角基础值。",
  shadowStyle: "阴影层次强度。",
  motionLevel: "动效强度。",
  density: "界面内容密度。",
  productCardVariant: "商品卡模板风格。",
  cardStyle: "卡片外壳样式。",
  cardTextAlign: "商品卡文案对齐。",
  imageRatio: "商品图比例。",
  imageFit: "商品图裁切方式。",
  priceStyle: "价格文字风格。",
  homeLayout: "首页模块排布风格。",
  headerStyle: "首页头部样式。",
  bannerStyle: "Banner 样式。",
  couponStyle: "优惠券模块样式。",
  memberCardStyle: "会员卡样式。",
  categoryIconStyle: "分类图标样式。",
  badgeStyle: "徽标样式。",
  adminThemeMode: "后台主题是否跟随前台。",
  fontFamily: "全局字体族。",
  isDefaultSkin: "默认皮肤：新用户默认看到。",
  category: "用于后台皮肤库分类筛选，可按运营习惯自由填写。",
};
