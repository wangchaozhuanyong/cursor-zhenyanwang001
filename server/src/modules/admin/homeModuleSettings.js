// @ts-nocheck
/**
 * 棣栭〉鍐呭妯″潡寮€鍏充笌灞曠ず鍙傛暟锛堝瓨 site_settings.home_module_settings JSON锛? */
const siteSettingsRepo = require('./repository/adminSiteSettings.repository');
const productModule = require('../product');

const SETTING_KEY = 'home_module_settings';

const MODULE_KEYS = [
  'banner',
  'trust_bar',
  'nav_grid',
  'member_coupons',
  'new_arrivals',
  'hot_sales',
  'recommend',
  'guest_recommend',
  'flash_sale_section',
  'coupon_center',
  'new_user_gift',
  'full_reduction_notice',
  'promotion_banner',
];

const DEFAULT_MODULES = {
  ...Object.fromEntries(MODULE_KEYS.map((k) => [k, true])),
  member_coupons: false,
};

const DEFAULT_SETTINGS = {
  modules: { ...DEFAULT_MODULES },
  hotBatchSize: 4,
  recBatchSize: 4,
  guestRecommendMax: 8,
};

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function parseSettings(raw) {
  if (!raw) return { ...DEFAULT_SETTINGS, modules: { ...DEFAULT_MODULES } };
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ...DEFAULT_SETTINGS, modules: { ...DEFAULT_MODULES } };
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ...DEFAULT_SETTINGS, modules: { ...DEFAULT_MODULES } };
  }
  const modules = { ...DEFAULT_MODULES };
  if (parsed.modules && typeof parsed.modules === 'object') {
    for (const key of MODULE_KEYS) {
      if (parsed.modules[key] === false || parsed.modules[key] === 0 || parsed.modules[key] === '0') {
        modules[key] = false;
      } else if (parsed.modules[key] === true || parsed.modules[key] === 1 || parsed.modules[key] === '1') {
        modules[key] = true;
      }
    }
  }
  return {
    modules,
    hotBatchSize: clampInt(
      parsed.hotBatchSize ?? parsed.hot_batch_size,
      2,
      12,
      DEFAULT_SETTINGS.hotBatchSize,
    ),
    recBatchSize: clampInt(
      parsed.recBatchSize ?? parsed.rec_batch_size,
      2,
      12,
      DEFAULT_SETTINGS.recBatchSize,
    ),
    guestRecommendMax: clampInt(
      parsed.guestRecommendMax ?? parsed.guest_recommend_max,
      4,
      24,
      DEFAULT_SETTINGS.guestRecommendMax,
    ),
  };
}

async function getHomeModuleSettings() {
  const raw = await siteSettingsRepo.selectSettingValue(SETTING_KEY);
  return parseSettings(raw);
}

async function saveHomeModuleSettings(body, adminUserId, req) {
  const current = await getHomeModuleSettings();
  const next = { ...current };

  if (body.modules && typeof body.modules === 'object') {
    next.modules = { ...current.modules };
    for (const key of MODULE_KEYS) {
      if (body.modules[key] === undefined) continue;
      const v = body.modules[key];
      next.modules[key] = !(v === false || v === 0 || v === '0');
    }
  }
  if (body.hotBatchSize !== undefined) {
    next.hotBatchSize = clampInt(body.hotBatchSize, 2, 12, current.hotBatchSize);
  }
  if (body.recBatchSize !== undefined) {
    next.recBatchSize = clampInt(body.recBatchSize, 2, 12, current.recBatchSize);
  }
  if (body.guestRecommendMax !== undefined) {
    next.guestRecommendMax = clampInt(body.guestRecommendMax, 4, 24, current.guestRecommendMax);
  }

  await siteSettingsRepo.upsertSetting(SETTING_KEY, JSON.stringify(next));

  try {
    const productApi = /** @type {any} */ (productModule).api || {};
    if (typeof productApi.clearCatalogCache === 'function') productApi.clearCatalogCache();
  } catch {
    /* catalog 鏈姞杞芥椂蹇界暐 */
  }

  const { writeAuditLog } = require('../../utils/auditLog');
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'home_ops.module_settings_update',
    objectType: 'site_settings',
    objectId: SETTING_KEY,
    summary: '更新首页模块开关',
    before: current,
    after: next,
    result: 'success',
  }).catch(() => {});

  return next;
}

module.exports = {
  SETTING_KEY,
  MODULE_KEYS,
  DEFAULT_SETTINGS,
  parseSettings,
  getHomeModuleSettings,
  saveHomeModuleSettings,
};

