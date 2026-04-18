/** CMS 页面与站点信息（与后端 /content 一致） */
export interface ContentPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  updated_at: string;
}

export interface SiteInfo {
  siteName?: string;
  siteDescription?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  currency?: string;
  whatsappUrl?: string;
  wechatId?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  address?: string;
}
