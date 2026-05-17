import type { ThemeConfig, ThemeSceneTag } from "@/types/theme";

export type PreviewMode = "home" | "product" | "admin" | "components" | "mobile";
export type PreviewDevice = "phone" | "tablet" | "desktop";
export type FullscreenPreviewMode =
  | "home"
  | "product"
  | "category"
  | "cart"
  | "profile"
  | "admin_home"
  | "admin_products"
  | "admin_orders";

export const PREVIEW_MODE_LABELS: Record<PreviewMode, string> = {
  home: "前台首页",
  product: "商品详情",
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

export const SCENE_FILTER_OPTIONS: Array<{ id: "all" | ThemeSceneTag; label: string }> = [
  { id: "all", label: "全部" },
  { id: "default", label: "默认" },
  { id: "life_service", label: "生活服务" },
  { id: "premium", label: "高端服务" },
  { id: "visa", label: "签证留学" },
  { id: "mall", label: "好物商城" },
  { id: "admin", label: "后台管理" },
  { id: "promotion", label: "促销活动" },
];

export const SCENE_TAG_LABELS: Record<ThemeSceneTag, string> = {
  default: "默认",
  life_service: "生活服务",
  premium: "高端服务",
  visa: "签证留学",
  mall: "好物商城",
  admin: "后台管理",
  promotion: "促销活动",
};

export const enumValueLabels: Record<string, string> = {
  none: "无",
  subtle: "轻微",
  soft: "柔和",
  medium: "中等",
  glow: "发光",
  pill: "胶囊",
  rounded: "圆角",
  square: "方角",
  clean: "简洁",
  floating: "悬浮",
  glass: "玻璃",
  solid: "实心",
  outline: "描边",
  normal: "常规",
  bold: "加粗",
  luxury: "高级",
  standard: "标准",
  premium: "高级",
  deal: "促销",
  compact: "紧凑",
  bordered: "描边",
  seamless: "无缝",
  elevated: "悬浮",
  minimal: "极简",
  left: "左对齐",
  center: "居中",
  cover: "裁切铺满",
  contain: "完整显示",
  classic: "经典",
  magazine: "杂志",
  transparent: "透明",
  dark: "深色",
  ticket: "券样式",
  light: "浅色",
  gold: "金色",
  blackGold: "黑金",
  fresh: "清新",
  circle: "圆形",
  rich: "丰富",
  comfortable: "舒适",
  follow_store: "跟随前台",
  fixed: "固定",
};

export const enumOptions = {
  shadowStyle: ["none", "subtle", "soft", "medium", "glow"] as const,
  buttonStyle: ["pill", "rounded", "square"] as const,
  navStyle: ["clean", "floating", "glass"] as const,
  badgeStyle: ["solid", "soft", "outline"] as const,
  priceStyle: ["normal", "bold", "luxury"] as const,
  productCardVariant: ["standard", "premium", "deal", "compact"] as const,
  cardStyle: ["bordered", "seamless", "elevated", "minimal"] as const,
  cardTextAlign: ["left", "center"] as const,
  imageRatio: ["1 / 1", "4 / 5", "3 / 4", "16 / 9"] as const,
  imageFit: ["cover", "contain"] as const,
  homeLayout: ["classic", "premium", "deal", "magazine"] as const,
  headerStyle: ["clean", "premium", "transparent", "dark"] as const,
  bannerStyle: ["clean", "premium", "deal", "dark", "fresh"] as const,
  couponStyle: ["ticket", "premium", "deal", "minimal"] as const,
  memberCardStyle: ["light", "gold", "blackGold", "fresh"] as const,
  categoryIconStyle: ["circle", "soft", "solid", "outline"] as const,
  motionLevel: ["none", "soft", "rich"] as const,
  density: ["comfortable", "compact"] as const,
  adminThemeMode: ["fixed", "follow_store"] as const,
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
  clientEnabled: "允许用户在前台切换到此皮肤。",
  isDefaultSkin: "默认皮肤：新用户默认看到。",
  sceneTag: "用于在皮肤库筛选场景。",
};
