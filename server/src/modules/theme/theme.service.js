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

function normalizeThemeSkinPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object') return null;
  const defaultSkinId = typeof rawPayload.defaultSkinId === 'string' ? rawPayload.defaultSkinId : null;
  const skins = Array.isArray(rawPayload.skins) ? rawPayload.skins : null;
  if (!skins || skins.length === 0) return null;

  const normalizedSkins = skins
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({
      id: String(s.id ?? '').trim() || `skin_${Math.random().toString(16).slice(2)}`,
      name: String(s.name ?? '').trim() || '皮肤',
      config: normalizeThemeConfig(s.config),
    }));

  const chosenDefault =
    (defaultSkinId && normalizedSkins.some((s) => s.id === defaultSkinId)) ? defaultSkinId : normalizedSkins[0]?.id;

  return {
    defaultSkinId: chosenDefault,
    skins: normalizedSkins,
  };
}

async function getActiveThemeConfig() {
  const skinsRaw = await repo.selectThemeSkinsRaw();
  if (skinsRaw) {
    try {
      const parsed = JSON.parse(skinsRaw);
      const normalized = normalizeThemeSkinPayload(parsed);
      if (normalized?.skins?.length) {
        const active =
          normalized.skins.find((s) => s.id === normalized.defaultSkinId) || normalized.skins[0];
        return active.config;
      }
    } catch {
      // fallback to legacy theme_config
    }
  }

  // Legacy fallback: theme_config
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
    // If v2 skins exist, update the active (default) skin config as well
    const skinsRaw = await repo.selectThemeSkinsRaw();
    if (skinsRaw) {
      try {
        const parsed = JSON.parse(skinsRaw);
        const normalized = normalizeThemeSkinPayload(parsed);
        if (normalized?.skins?.length) {
          const nextSkins = normalized.skins.map((s) =>
            s.id === normalized.defaultSkinId ? { ...s, config: next } : s,
          );
          await repo.upsertThemeSkins(
            JSON.stringify({ defaultSkinId: normalized.defaultSkinId, skins: nextSkins }),
          );
        } else {
          await repo.upsertThemeConfig(JSON.stringify(next));
        }
      } catch {
        await repo.upsertThemeConfig(JSON.stringify(next));
      }
    } else {
      await repo.upsertThemeConfig(JSON.stringify(next));
    }

    // Keep legacy key in sync for older clients / fallbacks
    await repo.upsertThemeConfig(JSON.stringify(next));

    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'settings.theme_update',
      objectType: 'site_settings',
      objectId: 'theme_config',
      summary: '更新主题配置（兼容 v2 皮肤默认项）',
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

async function getThemeSkins() {
  const skinsRaw = await repo.selectThemeSkinsRaw();
  if (skinsRaw) {
    try {
      const parsed = JSON.parse(skinsRaw);
      const normalized = normalizeThemeSkinPayload(parsed);
      if (normalized?.skins?.length) {
        return normalized;
      }
    } catch {
      // fallback to legacy
    }
  }

  // Legacy fallback: single skin from theme_config
  const raw = await repo.selectThemeConfigRaw();
  const config = raw ? normalizeThemeConfig(JSON.parse(raw)) : DEFAULT_THEME_CONFIG;
  return {
    defaultSkinId: 'default',
    skins: [{ id: 'default', name: '默认皮肤', config }],
  };
}

async function updateThemeSkins(themeSkinsPayload, adminUserId, req) {
  const before = await getThemeSkins();
  const normalized = normalizeThemeSkinPayload(themeSkinsPayload);
  const next = normalized ?? before;

  try {
    await repo.upsertThemeSkins(JSON.stringify(next));

    // Keep legacy key in sync with active skin for older clients
    if (next?.skins?.length) {
      const active = next.skins.find((s) => s.id === next.defaultSkinId) || next.skins[0];
      await repo.upsertThemeConfig(JSON.stringify(active.config));
    }

    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'settings.theme_skins_update',
      objectType: 'site_settings',
      objectId: 'theme_skins',
      summary: '更新皮肤集合与默认皮肤',
      before,
      after: next,
      result: 'success',
    });

    return next;
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'settings.theme_skins_update',
      objectType: 'site_settings',
      objectId: 'theme_skins',
      summary: '更新皮肤集合失败',
      before,
      after: themeSkinsPayload,
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

module.exports = {
  getActiveThemeConfig,
  updateThemeConfig,
  getThemeSkins,
  updateThemeSkins,
};
