const contentRepo = require('./content.repository');

/**
 * 公开站点信息字段（供前端无鉴权读取）
 *  - 基础品牌：siteName / siteDescription / siteSlogan / logoUrl / faviconUrl / brandColor
 *  - 联系方式：contactPhone / contactEmail / contactWhatsApp / whatsappUrl / wechatId / address / businessHours
 *  - 社交：instagramUrl / facebookUrl / tiktokUrl / xhsUrl
 *  - 业务：currency
 *  - SEO：seoTitle / seoDescription / seoKeywords / ogImageUrl
 *  - 页脚：footerCompanyName / footerCopyright / footerIcpNo / footerPolicyUrl / footerTermsUrl
 */
const PUBLIC_SITE_KEYS = [
  // 基础品牌
  'siteName', 'siteDescription', 'siteSlogan', 'logoUrl', 'faviconUrl', 'brandColor',
  // 联系方式
  'contactPhone', 'contactEmail', 'contactWhatsApp', 'whatsappUrl', 'wechatId',
  'address', 'businessHours',
  // 社交
  'instagramUrl', 'facebookUrl', 'tiktokUrl', 'xhsUrl',
  // 业务
  'currency',
  // SEO
  'seoTitle', 'seoDescription', 'seoKeywords', 'ogImageUrl',
  // 页脚
  'footerCompanyName', 'footerCopyright', 'footerIcpNo',
  'footerPolicyUrl', 'footerTermsUrl',
];

exports.PUBLIC_SITE_KEYS = PUBLIC_SITE_KEYS;

exports.getPublicSiteInfo = async () => {
  const [rows] = await contentRepo.getSiteSettingsByKeys(PUBLIC_SITE_KEYS);
  const info = {};
  rows.forEach((r) => { info[r.setting_key] = r.setting_value; });
  return info;
};

exports.getContentPageBySlug = async (slug) => {
  const [[page]] = await contentRepo.getContentPageBySlug(slug);
  return page || null;
};
