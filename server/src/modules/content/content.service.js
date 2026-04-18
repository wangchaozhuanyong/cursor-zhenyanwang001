const contentRepo = require('./content.repository');

/**
 * 公开站点信息字段（供前端无鉴权读取）
 *  - 基础品牌：siteName / siteDescription / siteSlogan / logoUrl / faviconUrl / brandColor
 *  - 联系方式：contactPhone / contactEmail / contactWhatsApp / whatsappUrl / wechatId / address / businessHours
 *  - 社交：instagramUrl / facebookUrl / tiktokUrl / xhsUrl
 *  - 业务：currency
 *  - SEO：seoTitle / seoDescription / seoKeywords / ogImageUrl
 *  - 页脚：footerCompanyName / footerCopyright / footerIcpNo / footerPolicyUrl / footerTermsUrl
 *  - 政策路径：privacyPolicyPath / termsPath / refundPolicyPath / shippingPolicyPath
 *  - 购物说明：supportText / shippingNotice / paymentNotice
 *  - 自定义页脚导航（JSON 字符串）：footerNav
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
  // 政策内部页路径（CMS slug 路由，如 /content/privacy-policy）
  'privacyPolicyPath', 'termsPath', 'refundPolicyPath', 'shippingPolicyPath',
  // 购物 / 售后 / 支付说明（短文案，可在 Cart / Checkout / OrderDetail 等节点透出）
  'supportText', 'shippingNotice', 'paymentNotice',
  // 自定义页脚导航（JSON 字符串：[{label,path}]，未设置则前端使用默认导航）
  'footerNav',
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
