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
  bgColor: { label: "页面背景", hint: "整页底色、列表背景", contrastBg: "bg" },
  surfaceColor: { label: "卡片背景", hint: "卡片、弹层、输入框底色", contrastBg: "surface" },
  primaryColor: { label: "主色", hint: "主按钮、导航选中、分类选中、后台菜单激活态", contrastBg: "primary" },
  secondaryColor: { label: "辅色", hint: "次按钮、标签底、区块强调", contrastBg: "bg" },
  accentColor: { label: "强调色", hint: "高亮标签、活动角标", contrastBg: "bg" },
  priceColor: { label: "价格色", hint: "商品价格、促销价格、优惠强调", contrastBg: "surface" },
  textColor: { label: "正文色", hint: "标题、正文、表格主文字", contrastBg: "bg" },
  mutedTextColor: { label: "次文字色", hint: "说明、时间、辅助信息", contrastBg: "bg" },
  borderColor: { label: "边框色", hint: "卡片边框、表格线、分割线", contrastBg: "bg" },
  successColor: { label: "成功色", hint: "成功状态、完成、通过", contrastBg: "bg" },
  warningColor: { label: "警告色", hint: "待处理、提醒、库存预警", contrastBg: "bg" },
  dangerColor: { label: "危险色", hint: "删除、失败、库存不足、取消订单", contrastBg: "danger" },
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
  basic: "基础信息",
  colors: "基础颜色",
  text: "文字与边框",
  status: "状态颜色",
  buttons: "按钮与导航",
  card: "商品卡",
  marketing: "首页营销模块",
  advanced: "高级设置",
  health: "皮肤健康检查",
};

export const FIELD_HELP_TEXTS: Record<string, string> = {
  primaryColor: "主色用于主按钮、导航选中、分类选中、后台菜单激活态等核心交互元素。",
  secondaryColor: "辅色用于次按钮、标签底、区块强调等次要视觉层次。",
  accentColor: "强调色用于高亮标签、活动角标、营销点缀。",
  priceColor: "价格色用于商品价格、促销价、优惠金额等商业信息强调。",
  bgColor: "页面背景色，影响整页底色与列表区域背景。",
  surfaceColor: "卡片背景色，用于商品卡、弹层、输入框等浮层表面。",
  textColor: "正文色，用于标题、正文、表格主文字。",
  mutedTextColor: "次文字色，用于说明、时间、辅助信息等弱层级文字。",
  borderColor: "边框色，用于卡片边框、表格线、分割线。",
  successColor: "成功色，用于完成、通过、库存充足等正向状态。",
  warningColor: "警告色，用于待处理、提醒、库存预警等注意状态。",
  dangerColor: "危险色，用于删除、失败、库存不足、取消订单等风险操作。",
  buttonStyle: "控制主按钮与次要按钮的圆角形态（胶囊 / 圆角 / 方角）。",
  navStyle: "底部导航外观：简洁通栏、居中悬浮胶囊、半透明毛玻璃。",
  radius: "全局圆角基准，影响卡片、输入框、Banner 等组件。",
  shadowStyle: "卡片与浮层的阴影强度，影响层次感。",
  motionLevel: "页面动效强度：无动效、柔和、丰富。",
  density: "界面密度：舒适为默认间距，紧凑缩小卡片、列表与表格行高。",
  productCardVariant: "商品卡布局变体：标准、高级、促销、紧凑横版。",
  cardStyle: "商品卡外壳：描边、无缝、悬浮、极简。",
  cardTextAlign: "商品卡内标题与价格的对齐方式。",
  imageRatio: "商品图展示比例，影响列表与详情主图区域。",
  imageFit: "商品图填充方式：裁切铺满或完整显示。",
  priceStyle: "价格文字粗细与高级感（常规 / 加粗 / 高级）。",
  homeLayout: "首页区块编排风格：经典、杂志、促销等布局节奏。",
  headerStyle: "首页顶部栏风格：简洁、高级、透明、深色。",
  bannerStyle: "首页 Banner 圆角、遮罩与促销强调风格。",
  couponStyle: "优惠券卡片视觉：票券、高级、促销、极简。",
  memberCardStyle: "个人中心会员卡渐变风格，与首页预览一致。",
  categoryIconStyle: "首页分类入口图标：圆形、柔和底、实心底、描边。",
  badgeStyle: "商品标签样式：实心、柔和底、描边。",
  adminThemeMode: "后台主题：跟随前台皮肤，或固定为安全中性后台色。",
  fontFamily: "全站字体族，影响前台与后台文字渲染。",
  clientEnabled: "开启后，用户可在前台皮肤选择器中看到并切换此皮肤。",
  isDefaultSkin: "新用户与未手动选肤用户将默认使用此皮肤。",
  sceneTag: "标记皮肤适合的业务场景，便于在列表中筛选。",
};
