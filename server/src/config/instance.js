const NEUTRAL_SITE_NAME = '官方商城';
const NEUTRAL_SITE_DESCRIPTION = '本平台提供商品、服务与客户支持信息。';

function clean(value) {
  return String(value || '').trim();
}

function getSiteCode() {
  return clean(process.env.SITE_CODE);
}

function getEnvSiteName() {
  return clean(process.env.SITE_NAME);
}

function resolveSiteName(siteInfo = {}) {
  return clean(siteInfo.siteName) || getEnvSiteName() || NEUTRAL_SITE_NAME;
}

function resolveSiteDescription(siteInfo = {}) {
  return clean(siteInfo.siteDescription) || NEUTRAL_SITE_DESCRIPTION;
}

function getInstanceInfo() {
  return {
    siteCode: getSiteCode(),
    siteName: getEnvSiteName(),
    instanceEnv: clean(process.env.INSTANCE_ENV) || process.env.NODE_ENV || 'development',
    pm2App: clean(process.env.PM2_APP),
    projectDir: clean(process.env.PROJECT_DIR),
    publicAppUrl: clean(process.env.PUBLIC_APP_URL),
    dbName: clean(process.env.DB_NAME),
    storageDriver: clean(process.env.STORAGE_DRIVER).toLowerCase() || 'local',
    storageKeyPrefix: clean(process.env.STORAGE_KEY_PREFIX).replace(/^\/+|\/+$/g, ''),
    redisKeyPrefix: clean(process.env.REDIS_KEY_PREFIX).replace(/:+$/, ''),
    bullmqPrefix: clean(process.env.BULLMQ_PREFIX),
  };
}

function instanceLogPrefix(scope = '') {
  const siteCode = getSiteCode() || 'unknown-site';
  return scope ? `[${siteCode}][${scope}]` : `[${siteCode}]`;
}

module.exports = {
  NEUTRAL_SITE_DESCRIPTION,
  NEUTRAL_SITE_NAME,
  getEnvSiteName,
  getInstanceInfo,
  getSiteCode,
  instanceLogPrefix,
  resolveSiteDescription,
  resolveSiteName,
};
