const repo = require('./theme.repository');
const { DEFAULT_THEME_CONFIG } = require('./theme.default');
const { writeAuditLog } = require('../../utils/auditLog');

function normalizeThemeConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object') return DEFAULT_THEME_CONFIG;
  return {
    ...DEFAULT_THEME_CONFIG,
    ...rawConfig,
    light: {
      ...DEFAULT_THEME_CONFIG.light,
      ...(rawConfig.light || {}),
    },
    dark: {
      ...DEFAULT_THEME_CONFIG.dark,
      ...(rawConfig.dark || {}),
    },
  };
}

async function getActiveThemeConfig() {
  const raw = await repo.selectThemeConfigRaw();
  if (!raw) return DEFAULT_THEME_CONFIG;

  try {
    const parsed = JSON.parse(raw);
    return normalizeThemeConfig(parsed);
  } catch {
    return DEFAULT_THEME_CONFIG;
  }
}

async function updateThemeConfig(themeConfig, adminUserId, req) {
  const before = await getActiveThemeConfig();
  const next = normalizeThemeConfig(themeConfig);

  try {
    await repo.upsertThemeConfig(JSON.stringify(next));
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'settings.theme_update',
      objectType: 'site_settings',
      objectId: 'theme_config',
      summary: '更新主题配置',
      before,
      after: next,
      result: 'success',
    });
    return next;
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'settings.theme_update',
      objectType: 'site_settings',
      objectId: 'theme_config',
      summary: '更新主题配置失败',
      before,
      after: themeConfig,
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

module.exports = {
  getActiveThemeConfig,
  updateThemeConfig,
};
