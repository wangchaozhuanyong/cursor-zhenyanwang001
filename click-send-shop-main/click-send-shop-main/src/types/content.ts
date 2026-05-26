import type { HomeModuleSettings } from "@/constants/homeModules";

/** CMS 页面与站点信息（与后端 /content 一致） */
export interface ContentPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  updated_at: string;
}

/**
 * 站点公开信息（来源：site_settings 表，公开可读）
 * 与 server/src/modules/content/content.service.js 中的 PUBLIC_SITE_KEYS 严格对齐。
 * 所有字段均为可选 — 后台未配置时由前端兜底渲染。
 */
export interface SiteInfo {
  /* ─ 基础品牌 ─ */
  siteName?: string;
  siteDescription?: string;
  siteSlogan?: string;
  logoUrl?: string;
  faviconUrl?: string;
  appleTouchIcon?: string;

  /* ─ 联系方式（IM 客服见 supportDownloadConfig） ─ */
  contactPhone?: string;
  contactEmail?: string;
  address?: string;

  /* ─ 社交 ─ */
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  xhsUrl?: string;
  youtubeUrl?: string;
  otherSocialLinks?: string;

  /* ─ 业务 ─ */
  currency?: string;
  orderPaymentTimeoutEnabled?: string;
  orderPaymentTimeoutMinutes?: string;
  sstEnabled?: string;
  sstRatePercent?: string;
  sstLabel?: string;
  sstCustomerNote?: string;

  /* ─ SEO ─ */
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImageUrl?: string;
  googleSiteVerification?: string;
  defaultOgImageUrl?: string;
  complianceNotice?: string;
  ageGateEnabled?: string;
  minimumAge?: string;
  restrictedProductNoindexEnabled?: string;

  /* ─ 页脚 ─ */
  footerCompanyName?: string;
  companyName?: string;
  companyRegistrationNo?: string;
  footerCopyright?: string;
  footerIcpNo?: string;
  footerPolicyUrl?: string;
  footerTermsUrl?: string;

  /* ─ 政策内部页路径（CMS slug 路由） ─ */
  privacyPolicyPath?: string;
  termsPath?: string;
  refundPolicyPath?: string;
  shippingPolicyPath?: string;

  /* ─ 购物 / 售后 / 支付说明 ─ */
  supportText?: string;
  shippingNotice?: string;
  paymentNotice?: string;

  /* ─ 自定义页脚导航：JSON 字符串 [{ label, path }]，未设置时回退为内置默认 ─ */
  footerNav?: string;

  /* ─ 首页新品运营主视觉 ─ */
  newArrivalSectionTitle?: string;
  newArrivalSectionSubtitle?: string;
  newArrivalDisplayCount?: string;
  newArrivalShowPrice?: string;
  newArrivalOnlyInStock?: string;

  /* ─ 客服/APP 页配置（supportDownloadConfig JSON） ─ */
  supportDownloadConfig?: string;

  /* ─ Cookie 同意后的分析 / 广告追踪 ─ */
  ga4Enabled?: string;
  ga4MeasurementId?: string;
  metaPixelEnabled?: string;
  metaPixelId?: string;
  helpCenterConfig?: string;
}

export type SupportChannelType = "wechat" | "whatsapp" | "telegram";
export type DownloadPlatformType = "desktop" | "android" | "ios";
export type SupportDownloadTab = "support" | "download";

export interface SupportDownloadChannel {
  id: string;
  type: SupportChannelType;
  name: string;
  enabled: boolean;
  account: string;
  linkUrl: string;
  qrUrl: string;
  description: string;
  sortOrder: number;
}

export interface DownloadPlatform {
  id: string;
  type: DownloadPlatformType;
  enabled: boolean;
  title: string;
  description: string;
  buttonText: string;
  instructions: string[];
  sortOrder: number;
}

export interface SupportDownloadConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  defaultTab: SupportDownloadTab;
  support: {
    enabled: boolean;
    title: string;
    description: string;
    workingHours: string;
    channels: SupportDownloadChannel[];
  };
  download: {
    enabled: boolean;
    title: string;
    description: string;
    platforms: DownloadPlatform[];
  };
}

export interface HelpCenterCategory {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
}

export interface HelpCenterFaq {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  sortOrder: number;
  enabled: boolean;
}

/** 帮助中心仅维护 FAQ；客服渠道与工作时间见 supportDownloadConfig */
export interface HelpCenterConfig {
  categories: HelpCenterCategory[];
  faqs: HelpCenterFaq[];
}

/** 页脚导航条目（footerNav JSON 解析后的形态） */
export interface FooterNavItem {
  label: string;
  path: string;
  section?: "support" | "policy" | "other";
  enabled?: boolean;
  sortOrder?: number;
}

/** 后台 FooterNavEditor 编辑态 */
export type FooterNavEditorItem = Required<Pick<FooterNavItem, "label" | "path" | "section">> & {
  enabled: boolean;
  sortOrder: number;
};

export interface HomeNavItem {
  id: string;
  icon_url: string;
  title: string;
  link_url: string;
  target_type?: "url" | "category" | "categories" | "support";
  target_category_id?: string | null;
  target_support_channel_id?: string | null;
  sort_order: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HomeOpsConfig {
  navItems: HomeNavItem[];
  moduleSettings?: HomeModuleSettings;
}
