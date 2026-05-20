import type { SiteSettings, SiteSettingsSectionId } from "@/types/admin";

export type { SiteSettingsSectionId };

export type SiteFieldType = "text" | "textarea" | "select" | "switch" | "image" | "custom";

export interface SiteSettingFieldDef {
  key: keyof SiteSettings;
  label: string;
  placeholder?: string;
  hint?: string;
  type?: SiteFieldType;
  rows?: number;
  options?: { value: string; label: string }[];
  /** custom 时由页面渲染专用组件 */
  custom?: "policyPaths" | "footerNav" | "footerNavJson" | "settingsPreview";
}

export interface SiteSettingsSectionDef {
  id: SiteSettingsSectionId;
  title: string;
  description?: string;
  fields: SiteSettingFieldDef[];
  cards?: { title: string; fieldKeys: (keyof SiteSettings)[] }[];
}

export const SITE_SETTINGS_SECTIONS: SiteSettingsSectionDef[] = [
  {
    id: "basic",
    title: "基础信息",
    description: "站点名称、描述与默认货币，影响全站标题与 SEO 兜底。",
    fields: [
      { key: "siteName", label: "站点名称", placeholder: "例如：官方商城", hint: "必填；用于浏览器标题尾缀与页脚品牌" },
      { key: "siteSlogan", label: "Slogan / 副标题", placeholder: "尊享品质，精选全球好物" },
      { key: "siteDescription", label: "站点描述", type: "textarea", rows: 2, placeholder: "用于首页与 SEO description 兜底" },
      {
        key: "currency",
        label: "默认货币",
        type: "select",
        options: [
          { value: "MYR", label: "MYR (RM)" },
          { value: "CNY", label: "CNY (¥)" },
          { value: "USD", label: "USD ($)" },
          { value: "SGD", label: "SGD (S$)" },
        ],
      },
    ],
  },
  {
    id: "brand",
    title: "品牌视觉",
    description: "Logo 与 Favicon，上传后自动转 WEBP 并写入设置。",
    fields: [
      { key: "logoUrl", label: "Logo", type: "image", hint: "推荐 256×256；用于头部、登录页" },
      { key: "faviconUrl", label: "Favicon", type: "image", hint: "推荐 32×32；浏览器标签图标" },
    ],
  },
  {
    id: "contact",
    title: "联系方式",
    fields: [
      { key: "contactPhone", label: "客服电话", placeholder: "+60 12-345 6789" },
      { key: "contactEmail", label: "客服邮箱", placeholder: "support@example.com" },
      { key: "contactWhatsApp", label: "WhatsApp 号码", placeholder: "60123456789", hint: "仅数字，用于生成 wa.me" },
      { key: "whatsappUrl", label: "WhatsApp 完整链接", placeholder: "https://wa.me/60xxxxxxxxxx" },
      { key: "wechatId", label: "微信号", placeholder: "客服微信号" },
      { key: "address", label: "公司地址", placeholder: "Kuala Lumpur, Malaysia" },
      { key: "businessHours", label: "营业时间", placeholder: "周一至周日 09:00 - 22:00" },
    ],
  },
  {
    id: "social",
    title: "社交媒体",
    fields: [
      { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/..." },
      { key: "facebookUrl", label: "Facebook", placeholder: "https://facebook.com/..." },
      { key: "tiktokUrl", label: "TikTok", placeholder: "https://tiktok.com/@..." },
      { key: "xhsUrl", label: "小红书", placeholder: "https://xiaohongshu.com/..." },
    ],
  },
  {
    id: "orders",
    title: "订单规则",
    description: "自动确认收货与未支付订单超时取消。",
    fields: [
      {
        key: "autoConfirmReceiveEnabled",
        label: "发货后自动确认收货",
        type: "switch",
        hint: "以订单首次发货时间为起点，约每 15 分钟扫描",
      },
      { key: "autoConfirmReceiveDays", label: "自动确认天数", placeholder: "7", hint: "1–365 整数" },
      {
        key: "orderPaymentTimeoutEnabled",
        label: "未支付订单自动取消",
        type: "switch",
        hint: "仅在线支付且待付款订单",
      },
      { key: "orderPaymentTimeoutMinutes", label: "未支付超时（分钟）", placeholder: "30", hint: "1–43200" },
    ],
  },
  {
    id: "tax",
    title: "税务设置",
    fields: [
      { key: "sstEnabled", label: "展示 SST / 含税拆分", type: "switch" },
      { key: "sstRatePercent", label: "SST 税率（%）", placeholder: "6" },
      { key: "sstLabel", label: "税种名称", placeholder: "SST" },
      { key: "sstCustomerNote", label: "前台说明文案", type: "textarea", rows: 2 },
    ],
  },
  {
    id: "seo",
    title: "SEO 与分享",
    fields: [
      { key: "seoTitle", label: "SEO 标题", placeholder: "站点名 - 官方商城" },
      { key: "seoDescription", label: "SEO 描述", type: "textarea", rows: 2, hint: "建议 160 字以内" },
      { key: "seoKeywords", label: "SEO 关键词", placeholder: "shop,malaysia" },
      { key: "ogImageUrl", label: "分享卡片图（OG）", type: "image", hint: "推荐 1200×630" },
      { key: "defaultOgImageUrl", label: "默认 OG 图", type: "image", hint: "单页未设 OG 时使用" },
      { key: "googleSiteVerification", label: "Google Site Verification", placeholder: "verification token" },
    ],
  },
  {
    id: "compliance",
    title: "合规与访问限制",
    fields: [
      { key: "complianceNotice", label: "全站合规说明", type: "textarea", rows: 2 },
      { key: "ageGateEnabled", label: "启用年龄提示", type: "switch" },
      { key: "minimumAge", label: "默认最低年龄", placeholder: "18" },
      { key: "restrictedProductNoindexEnabled", label: "受监管商品默认 noindex", type: "switch" },
    ],
  },
  {
    id: "footer",
    title: "页脚与政策",
    description: "政策正文请在内容管理编辑；此处配置路径与页脚导航。",
    cards: [
      { title: "页脚品牌", fieldKeys: ["footerCompanyName", "footerCopyright", "footerIcpNo"] },
      { title: "政策页路径", fieldKeys: ["privacyPolicyPath", "termsPath", "refundPolicyPath", "shippingPolicyPath"] },
    ],
    fields: [
      { key: "footerCompanyName", label: "公司名称", placeholder: "公司名称" },
      { key: "footerCopyright", label: "版权信息", placeholder: "© 2026 版权所有" },
      { key: "footerIcpNo", label: "备案号 / 注册号", placeholder: "可选" },
      { key: "privacyPolicyPath", label: "隐私政策路径", placeholder: "/content/privacy-policy", custom: "policyPaths" },
      { key: "termsPath", label: "用户协议路径", placeholder: "/content/terms-of-service" },
      { key: "refundPolicyPath", label: "退款政策路径", placeholder: "/content/refund-policy" },
      { key: "shippingPolicyPath", label: "配送政策路径", placeholder: "/content/shipping-policy" },
      { key: "footerNav", label: "页脚导航", type: "custom", custom: "footerNav" },
    ],
  },
  {
    id: "shopping",
    title: "购物说明",
    fields: [
      { key: "supportText", label: "客服支持说明", type: "textarea", rows: 2 },
      { key: "shippingNotice", label: "配送说明", type: "textarea", rows: 2 },
      { key: "paymentNotice", label: "支付说明", type: "textarea", rows: 2 },
    ],
  },
  {
    id: "analytics",
    title: "埋点与 Cookie",
    description: "须用户同意对应 Cookie 后才会加载第三方脚本。",
    fields: [
      { key: "ga4Enabled", label: "GA4 分析", type: "switch" },
      { key: "ga4MeasurementId", label: "GA4 Measurement ID", placeholder: "G-XXXXXXXXXX" },
      { key: "metaPixelEnabled", label: "Meta Pixel", type: "switch" },
      { key: "metaPixelId", label: "Meta Pixel ID", placeholder: "123456789012345" },
    ],
  },
  {
    id: "advanced",
    title: "高级配置",
    description: "默认折叠；仅供技术排查或批量导入。",
    fields: [
      { key: "footerNav", label: "页脚导航 JSON", type: "custom", custom: "footerNavJson" },
      { key: "siteName", label: "设置预览", type: "custom", custom: "settingsPreview" },
    ],
  },
];

export function getSectionById(id: SiteSettingsSectionId): SiteSettingsSectionDef {
  return SITE_SETTINGS_SECTIONS.find((s) => s.id === id) ?? SITE_SETTINGS_SECTIONS[0];
}

export function getSectionFieldKeys(sectionId: SiteSettingsSectionId): (keyof SiteSettings)[] {
  const section = getSectionById(sectionId);
  if (sectionId === "advanced") {
    return ["footerNav"];
  }
  const keys = section.fields.map((f) => f.key);
  return [...new Set(keys)];
}

export function getAllPersistedFieldKeys(): (keyof SiteSettings)[] {
  const ids: SiteSettingsSectionId[] = [
    "basic", "brand", "contact", "social", "orders", "tax", "seo", "compliance", "footer", "shopping", "analytics",
  ];
  const keys = ids.flatMap((id) => getSectionFieldKeys(id));
  return [...new Set(keys)];
}

/** 右栏说明文案 */
export const SECTION_HELP: Record<
  SiteSettingsSectionId,
  { impacts: string[]; required?: string[]; tips?: string[] }
> = {
  basic: {
    impacts: ["浏览器标题", "首页标题", "页脚品牌区", "SEO 兜底信息"],
    required: ["站点名称", "默认货币"],
  },
  brand: {
    impacts: ["网站 Logo", "浏览器 Favicon", "登录页 Logo"],
  },
  contact: {
    impacts: ["页脚联系方式", "关于我们", "订单详情客服入口"],
  },
  social: {
    impacts: ["页脚社交图标", "关于我们社交链接"],
  },
  orders: {
    impacts: ["订单状态", "自动确认收货", "积分结算", "未支付自动取消"],
  },
  tax: {
    impacts: ["购物车/结算 SST 展示", "订单税务快照"],
    tips: ["税率按含税价反算，运费不计税"],
  },
  seo: {
    impacts: ["搜索结果", "社交分享卡片", "Google 验证"],
    tips: ["描述建议 ≤160 字", "OG 图建议 1200×630"],
  },
  compliance: {
    impacts: ["年龄提示弹窗", "受监管商品 SEO", "全站合规文案"],
  },
  footer: {
    impacts: ["未登录首页页脚", "登录页协议链接路径", "Cookie 政策链接"],
    tips: ["政策正文请到内容管理编辑", "此处仅配置跳转路径与导航菜单"],
  },
  shopping: {
    impacts: ["购物车", "结算页", "订单详情信任文案"],
  },
  analytics: {
    impacts: ["GA4 / Meta Pixel 加载", "依赖 Cookie 同意"],
  },
  advanced: {
    impacts: ["直接编辑 footerNav JSON"],
    tips: ["误改可能导致页脚导航异常，建议优先用可视化编辑器"],
  },
};
