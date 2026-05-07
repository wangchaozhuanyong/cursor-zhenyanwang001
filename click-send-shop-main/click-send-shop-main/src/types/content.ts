/** CMS 页面与站点信息（与后端 /content 一致） */
export interface ContentPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  updated_at: string;
}

/**
 * 站点公开信息（来源：site_settings 表，无需登录可读）
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
  brandColor?: string;

  /* ─ 联系方式 ─ */
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  whatsappUrl?: string;
  wechatId?: string;
  address?: string;
  businessHours?: string;

  /* ─ 社交 ─ */
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  xhsUrl?: string;

  /* ─ 业务 ─ */
  currency?: string;

  /* ─ SEO ─ */
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImageUrl?: string;

  /* ─ 页脚 ─ */
  footerCompanyName?: string;
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
  newArrivalHeroImage?: string;
  newArrivalHeroTitle?: string;
  newArrivalHeroSubtitle?: string;
  newArrivalHeroCtaText?: string;
}

/** 页脚导航条目（footerNav JSON 解析后的形态） */
export interface FooterNavItem {
  label: string;
  path: string;
}
