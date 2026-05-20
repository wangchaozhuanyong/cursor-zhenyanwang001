const contentRepo = require('../repository/content.repository');
const adminModule = require('../../admin');

const adminApi = /** @type {any} */ (adminModule).api || {};

function requireAdminApi(name) {
  const fn = adminApi[name];
  if (typeof fn !== 'function') {
    throw new Error(`Admin 模块 API 未暴露方�? ${name}`);
  }
  return fn;
}

/**
 * 公开站点信息字段（供前端无鉴权读取）
 *  - 基础品牌：siteName / siteDescription / siteSlogan / logoUrl / faviconUrl
 *  - 联系方式：contactPhone / contactEmail / contactWhatsApp / whatsappUrl / wechatId / address / businessHours
 *  - 社交：instagramUrl / facebookUrl / tiktokUrl / xhsUrl
 *  - 业务：currency / sstEnabled / sstRatePercent / sstLabel / sstCustomerNote
 *  - SEO：seoTitle / seoDescription / seoKeywords / ogImageUrl
 *  - 页脚：footerCompanyName / footerCopyright / footerIcpNo / footerPolicyUrl / footerTermsUrl
 *  - 政策路径：privacyPolicyPath / termsPath / refundPolicyPath / shippingPolicyPath
 *  - 购物说明：supportText / shippingNotice / paymentNotice
 *  - 自定义页脚导航（JSON 字符串）：footerNav
 *  - 追踪配置：ga4Enabled / ga4MeasurementId / metaPixelEnabled / metaPixelId
 */
const PUBLIC_SITE_KEYS = [
  // 基础品牌
  'siteName', 'siteDescription', 'siteSlogan', 'logoUrl', 'faviconUrl',
  // 联系方式
  'contactPhone', 'contactEmail', 'contactWhatsApp', 'whatsappUrl', 'wechatId',
  'address', 'businessHours',
  // 社交
  'instagramUrl', 'facebookUrl', 'tiktokUrl', 'xhsUrl',
  // 业务
  'currency',
  'orderPaymentTimeoutEnabled',
  'orderPaymentTimeoutMinutes',
  'sstEnabled',
  'sstRatePercent',
  'sstLabel',
  'sstCustomerNote',
  // SEO
  'seoTitle', 'seoDescription', 'seoKeywords', 'ogImageUrl',
  'googleSiteVerification', 'defaultOgImageUrl', 'complianceNotice',
  'ageGateEnabled', 'minimumAge', 'restrictedProductNoindexEnabled',
  // 页脚
  'footerCompanyName', 'footerCopyright', 'footerIcpNo',
  'footerPolicyUrl', 'footerTermsUrl',
  // 政策内部页路径（CMS slug 路由，如 /content/privacy-policy�?  'privacyPolicyPath', 'termsPath', 'refundPolicyPath', 'shippingPolicyPath',
  // 购物 / 售后 / 支付说明（短文案，可�?Cart / Checkout / OrderDetail 等节点透出�?  'supportText', 'shippingNotice', 'paymentNotice',
  // 自定义页脚导航（JSON 字符串：[{label,path}]，未设置则前端使用默认导航）
  'footerNav',
  // 首页新品运营主视�?  'newArrivalSectionTitle', 'newArrivalSectionSubtitle', 'newArrivalDisplayCount', 'newArrivalShowPrice', 'newArrivalOnlyInStock',
  // Cookie 同意后才会由前端读取并加载的分析/广告追踪配置
  'ga4Enabled', 'ga4MeasurementId', 'metaPixelEnabled', 'metaPixelId',
  'helpCenterConfig',
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

exports.getPublicHomeOps = async () => requireAdminApi('getPublicHomeOps')();


