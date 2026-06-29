/**
 * 首页内容模块开关与展示参数，存储于 site_settings.home_module_settings JSON。
 *
 * @typedef {Record<string, unknown>} PlainObject
 * @typedef {{
 *   modules: Record<string, boolean>,
 *   titles: Record<string, string>,
 *   bannerAutoplaySeconds: number,
 *   hotBatchSize: number,
 *   recBatchSize: number,
 *   guestRecommendMax: number,
 * }} HomeModuleSettings
 */
const siteSettingsRepo = require('./repository/adminSiteSettings.repository');
const productPublicApi = /** @type {any} */ (require('../product/publicApi'));

const SETTING_KEY = 'home_module_settings';

/** @type {readonly string[]} */
const MODULE_KEYS = [
  'banner',
  'trust_bar',
  'nav_grid',
  'new_arrivals',
  'hot_sales',
  'recommend',
  'guest_recommend',
  'invite_entry',
  'flash_sale_section',
  'coupon_center',
  'full_reduction_notice',
  'promotion_banner',
];

/** @type {Record<string, boolean>} */
const DEFAULT_MODULES = {
  ...Object.fromEntries(MODULE_KEYS.map((k) => [k, true])),
  full_reduction_notice: false,
  promotion_banner: false,
};

/** @type {HomeModuleSettings} */
const DEFAULT_SETTINGS = {
  modules: { ...DEFAULT_MODULES },
  titles: {},
  bannerAutoplaySeconds: 5,
  hotBatchSize: 4,
  recBatchSize: 4,
  guestRecommendMax: 8,
};

/**
 * @param {unknown} value
 * @returns {PlainObject | null}
 */
function asPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return /** @type {PlainObject} */ (value);
}

/**
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeTitle(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 40);
}

/**
 * @param {unknown} raw
 * @returns {Record<string, string>}
 */
function normalizeTitles(raw) {
  const rawTitles = asPlainObject(raw);
  /** @type {Record<string, string>} */
  const titles = {};
  if (!rawTitles) return titles;
  for (const key of MODULE_KEYS) {
    const title = normalizeTitle(rawTitles[key]);
    if (title) titles[key] = title;
  }
  return titles;
}

/**
 * @returns {HomeModuleSettings}
 */
function defaultSettings() {
  return {
    ...DEFAULT_SETTINGS,
    modules: { ...DEFAULT_MODULES },
    titles: {},
  };
}

/**
 * @param {unknown} raw
 * @returns {HomeModuleSettings}
 */
function parseSettings(raw) {
  if (!raw) return defaultSettings();
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return defaultSettings();
    }
  }
  const parsedSettings = asPlainObject(parsed);
  if (!parsedSettings) return defaultSettings();

  /** @type {Record<string, boolean>} */
  const modules = { ...DEFAULT_MODULES };
  const parsedModules = asPlainObject(parsedSettings.modules);
  if (parsedModules) {
    for (const key of MODULE_KEYS) {
      if (parsedModules[key] === false || parsedModules[key] === 0 || parsedModules[key] === '0') {
        modules[key] = false;
      } else if (parsedModules[key] === true || parsedModules[key] === 1 || parsedModules[key] === '1') {
        modules[key] = true;
      }
    }
  }
  return {
    modules,
    titles: normalizeTitles(parsedSettings.titles),
    bannerAutoplaySeconds: clampInt(
      parsedSettings.bannerAutoplaySeconds ?? parsedSettings.banner_autoplay_seconds,
      3,
      20,
      DEFAULT_SETTINGS.bannerAutoplaySeconds,
    ),
    hotBatchSize: clampInt(
      parsedSettings.hotBatchSize ?? parsedSettings.hot_batch_size,
      2,
      12,
      DEFAULT_SETTINGS.hotBatchSize,
    ),
    recBatchSize: clampInt(
      parsedSettings.recBatchSize ?? parsedSettings.rec_batch_size,
      2,
      12,
      DEFAULT_SETTINGS.recBatchSize,
    ),
    guestRecommendMax: clampInt(
      parsedSettings.guestRecommendMax ?? parsedSettings.guest_recommend_max,
      4,
      24,
      DEFAULT_SETTINGS.guestRecommendMax,
    ),
  };
}

/** @returns {Promise<HomeModuleSettings>} */
async function getHomeModuleSettings() {
  const raw = await siteSettingsRepo.selectSettingValue(SETTING_KEY);
  return parseSettings(raw);
}

/**
 * @param {PlainObject} body
 * @param {string | null | undefined} adminUserId
 * @param {import('express').Request | undefined} req
 * @returns {Promise<HomeModuleSettings>}
 */
async function saveHomeModuleSettings(body, adminUserId, req) {
  const current = await getHomeModuleSettings();
  /** @type {HomeModuleSettings} */
  const next = { ...current };

  const bodyModules = asPlainObject(body.modules);
  if (bodyModules) {
    next.modules = { ...current.modules };
    for (const key of MODULE_KEYS) {
      if (bodyModules[key] === undefined) continue;
      const v = bodyModules[key];
      next.modules[key] = !(v === false || v === 0 || v === '0');
    }
  }
  const bodyTitles = asPlainObject(body.titles);
  if (bodyTitles) {
    next.titles = { ...(current.titles || {}) };
    for (const key of MODULE_KEYS) {
      if (bodyTitles[key] === undefined) continue;
      const title = normalizeTitle(bodyTitles[key]);
      if (title) next.titles[key] = title;
      else delete next.titles[key];
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
  if (body.bannerAutoplaySeconds !== undefined || body.banner_autoplay_seconds !== undefined) {
    next.bannerAutoplaySeconds = clampInt(
      body.bannerAutoplaySeconds ?? body.banner_autoplay_seconds,
      3,
      20,
      current.bannerAutoplaySeconds || DEFAULT_SETTINGS.bannerAutoplaySeconds,
    );
  }

  await siteSettingsRepo.upsertSetting(SETTING_KEY, JSON.stringify(next));

  try {
    const homeApi = /** @type {any} */ (require('../home/publicApi')) || {};
    if (typeof homeApi.invalidateHomeBootstrapCache === 'function') homeApi.invalidateHomeBootstrapCache();
  } catch {
    /* home bootstrap cache is best-effort */
  }

  try {
    const productApi = productPublicApi || {};
    if (typeof productApi.clearCatalogCache === 'function') productApi.clearCatalogCache();
  } catch {
    /* catalog 尚未加载时忽略 */
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
