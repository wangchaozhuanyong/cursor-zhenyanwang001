const contentRepo = require('./content.repository');

const PUBLIC_SITE_KEYS = [
  'siteName', 'siteDescription', 'contactPhone', 'contactEmail',
  'contactWhatsApp', 'currency', 'whatsappUrl', 'wechatId',
  'instagramUrl', 'facebookUrl', 'address',
];

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
