const repo = require('../repository/adminSiteSettings.repository');
const { writeAuditLog } = require('../../../utils/auditLog');
const { BusinessError } = require('../../../errors');
const { LEGACY_IM_KEYS, stripHelpCenterConfig } = require('../../../data/supportDownloadMigration');

const BLOCKED_SITE_SETTING_KEYS = new Set(LEGACY_IM_KEYS);
const { invalidatePaymentTimeoutSettingsCache } = require('../../order/orderPaymentDeadline');
const sharp = require('sharp');
const { isS3StorageEnabled, uploadBufferToS3 } = require('../../../utils/objectStorage');
const { bufferMatchesDeclaredMime } = require('../../../utils/fileMagic');

function getSiteCapabilitiesApi() {
  return /** @type {any} */ (require('../../siteCapabilities/publicApi')) || {};
}

function getTelegramApi() {
  return /** @type {any} */ (require('../../telegram/publicApi')) || {};
}

function getUserApi() {
  return /** @type {any} */ (require('../../user/publicApi')) || {};
}

function getProductApi() {
  return /** @type {any} */ (require('../../product/publicApi')) || {};
}

function getHomeApi() {
  return /** @type {any} */ (require('../../home/publicApi')) || {};
}

const LEGACY_DEFAULT_OG_IMAGE_KEY = 'defaultOgImageUrl';
const SITE_ASSET_KEYS = new Set(['logoUrl', 'faviconUrl']);
const SITE_ASSET_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const HOME_PRODUCT_SETTING_KEYS = new Set(['newArrivalDisplayCount', 'newArrivalOnlyInStock']);

async function trimTransparentIconPadding(inputBuffer) {
  try {
    return await sharp(inputBuffer)
      .rotate()
      .trim({
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        threshold: 12,
      })
      .toBuffer();
  } catch {
    return sharp(inputBuffer).rotate().toBuffer();
  }
}

function rowsToMap(rows) {
  const settings = {};
  let version = 1;
  rows.forEach((r) => {
    settings[r.setting_key] = r.setting_value;
    version = Math.max(version, Number(r.version || 1));
  });
  settings.version = version;
  return settings;
}

function normalizeMergedOgImageSetting(settings) {
  const legacyValue = String(settings[LEGACY_DEFAULT_OG_IMAGE_KEY] || '').trim();
  if (!String(settings.ogImageUrl || '').trim() && legacyValue) {
    settings.ogImageUrl = legacyValue;
  }
  delete settings[LEGACY_DEFAULT_OG_IMAGE_KEY];
  return settings;
}

function normalizeSiteSettingsPayload(body) {
  const normalized = { ...body };
  if (Object.prototype.hasOwnProperty.call(normalized, LEGACY_DEFAULT_OG_IMAGE_KEY)) {
    if (!Object.prototype.hasOwnProperty.call(normalized, 'ogImageUrl')) {
      normalized.ogImageUrl = normalized[LEGACY_DEFAULT_OG_IMAGE_KEY];
    }
    delete normalized[LEGACY_DEFAULT_OG_IMAGE_KEY];
  }
  return normalized;
}

function omitBrandAssetsForAudit(value) {
  if (!value || typeof value !== 'object') return value;
  const { logoUrl, faviconUrl, ...rest } = value;
  return rest;
}

async function getShippingSettings() {
  const rows = await repo.selectShippingSettingsRows();
  return { data: rowsToMap(rows) };
}

async function updateShippingSettings(body, adminUserId, req) {
  const beforeRows = await repo.selectShippingSettingsRows();
  const beforeMap = rowsToMap(beforeRows);
  const expectedVersion = body.version === undefined || body.version === null || body.version === ''
    ? null
    : Number(body.version);
  if (expectedVersion !== null && Number(beforeMap.version || 1) !== expectedVersion) {
    throw new BusinessError(409, '数据已被其他管理员修改，请刷新后再编辑');
  }
  for (const [key, value] of Object.entries(body)) {
    if (key === 'version') continue;
    await repo.upsertSetting(`shipping_${key}`, value);
  }
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'settings.shipping_update', objectType: 'site_settings', objectId: null, summary: '更新运费设置', before: beforeMap, after: body, result: 'success' });
  return { data: null, message: '设置已更新' };
}

async function getSiteSettings() {
  const rows = await repo.selectNonShippingSettingsRows();
  return { data: normalizeMergedOgImageSetting(rowsToMap(rows)) };
}

async function selectSiteSettingValue(key) {
  return repo.selectSettingValue(key);
}

async function upsertSiteSetting(key, value) {
  return repo.upsertSetting(key, value);
}

async function updateSiteSettings(body, adminUserId, req) {
  const beforeRows = await repo.selectNonShippingSettingsRows();
  const beforeMap = normalizeMergedOgImageSetting(rowsToMap(beforeRows));
  const normalizedBody = normalizeSiteSettingsPayload(body);
  try {
    const expectedVersion = normalizedBody.version === undefined || normalizedBody.version === null || normalizedBody.version === ''
      ? null
      : Number(normalizedBody.version);
    if (expectedVersion !== null && Number(beforeMap.version || 1) !== expectedVersion) {
      throw new BusinessError(409, '数据已被其他管理员修改，请刷新后再编辑');
    }
    for (const [key, value] of Object.entries(normalizedBody)) {
      if (key === 'version') continue;
      if (BLOCKED_SITE_SETTING_KEYS.has(key)) continue;
      if (key === 'helpCenterConfig') {
        const { json } = stripHelpCenterConfig(value);
        await repo.upsertSetting(key, json ? JSON.stringify(json) : value);
        continue;
      }
      await repo.upsertSetting(key, value);
      if (key === 'ogImageUrl') {
        await repo.upsertSetting(LEGACY_DEFAULT_OG_IMAGE_KEY, value);
      }
    }
    if (
      Object.prototype.hasOwnProperty.call(normalizedBody, 'orderPaymentTimeoutEnabled')
      || Object.prototype.hasOwnProperty.call(normalizedBody, 'orderPaymentTimeoutMinutes')
    ) {
      invalidatePaymentTimeoutSettingsCache();
    }
    if (Object.keys(normalizedBody).some((key) => HOME_PRODUCT_SETTING_KEYS.has(key))) {
      try {
        const clearCatalogCache = getProductApi().clearCatalogCache;
        if (typeof clearCatalogCache === 'function') clearCatalogCache();
      } catch (err) {
        console.warn('[siteSettings] clearCatalogCache:', err?.message || err);
      }
    }
    try {
      const invalidateHomeBootstrapCache = getHomeApi().invalidateHomeBootstrapCache;
      if (typeof invalidateHomeBootstrapCache === 'function') invalidateHomeBootstrapCache();
    } catch (err) {
      console.warn('[siteSettings] invalidateHomeBootstrapCache:', err?.message || err);
    }
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'settings.site_update',
      objectType: 'site_settings',
      objectId: null,
      summary: '更新站点基础设置',
      before: omitBrandAssetsForAudit(beforeMap),
      after: omitBrandAssetsForAudit({ ...beforeMap, ...normalizedBody }),
      result: 'success',
    });
    return { data: null, message: '设置已更新' };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'settings.site_update',
      objectType: 'site_settings',
      objectId: null,
      summary: '站点设置更新失败',
      before: omitBrandAssetsForAudit(beforeMap),
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

async function processSiteAssetUpload(file, key) {
  if (key === 'faviconUrl') {
    const trimmed = await trimTransparentIconPadding(file.buffer);
    const pngBuffer = await sharp(trimmed)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
        withoutEnlargement: false,
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
    return { buffer: pngBuffer, contentType: 'image/png', ext: 'png' };
  }
  const webpBuffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer();
  return { buffer: webpBuffer, contentType: 'image/webp', ext: 'webp' };
}

async function uploadSiteAsset(file, key, adminUserId, req) {
  if (!SITE_ASSET_KEYS.has(key)) {
    return { error: { code: 400, message: '不支持的站点图片字段' } };
  }
  if (!file || !file.buffer) {
    return { error: { code: 400, message: '请选择要上传的图片' } };
  }
  const mime = String(file.mimetype || '').toLowerCase();
  if (!SITE_ASSET_MIMES.has(mime) || !bufferMatchesDeclaredMime(file.buffer, mime)) {
    return { error: { code: 400, message: '站点图片仅支持真实的 JPG、PNG、WebP 文件' } };
  }

  const beforeRows = await repo.selectNonShippingSettingsRows();
  const beforeMap = rowsToMap(beforeRows);

  const { buffer, contentType, ext } = await processSiteAssetUpload(file, key);
  let finalUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
  let storageProvider = 'db-inline';
  let storageKey = '';
  if (isS3StorageEnabled()) {
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 10);
    const uploaded = await uploadBufferToS3({
      key: `site-assets/${key}/${stamp}-${rand}.${ext}`,
      body: buffer,
      contentType,
      cacheControl: 'public, max-age=86400',
    });
    finalUrl = uploaded.url;
    storageProvider = 's3';
    storageKey = uploaded.key;
  }

  const recordUploadedAsset = getUserApi().safeRecordUploadedAsset;
  if (typeof recordUploadedAsset === 'function') {
    await recordUploadedAsset({
      uploaderId: adminUserId,
      uploaderType: 'admin',
      uploadSource: 'admin_site_asset',
      purpose: 'site_asset',
      mediaType: 'image',
      mimeType: contentType,
      originalMimeType: mime,
      originalFilename: file.originalname,
      filename: `${key}.${ext}`,
      storageProvider,
      storageKey,
      publicUrl: finalUrl,
      variantTag: key,
      status: 'ready',
      sizeBytes: buffer.length,
      buffer,
      metadata: {
        key,
        originalSizeBytes: file.size,
      },
    });
  }

  await repo.upsertSetting(key, finalUrl);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.site_asset_upload',
    objectType: 'site_settings',
    objectId: key,
    summary: `上传站点品牌图片 ${key}`,
    before: { [key]: beforeMap[key] ? '[replaced]' : '' },
    after: { [key]: finalUrl },
    result: 'success',
  });

  return {
    data: {
      key,
      url: finalUrl,
      storageProvider,
      storageKey,
    },
    message: '图片已保存到设置',
  };
}

async function getSiteCapabilities() {
  return { data: await getSiteCapabilitiesApi().getSiteCapabilities() };
}

async function updateSiteCapabilities(body, adminUserId, req) {
  const before = await getSiteCapabilitiesApi().getSiteCapabilities();
  const after = await getSiteCapabilitiesApi().saveSiteCapabilities(body);
  if (Object.prototype.hasOwnProperty.call(body, 'telegramOrderNotifyEnabled')) {
    try {
      const syncFn = getTelegramApi().syncOrderNotifyEnabled;
      if (typeof syncFn === 'function') {
        await syncFn(after.telegramOrderNotifyEnabled);
      }
    } catch (e) {
      console.error('[siteSettings] sync telegram enabled failed:', e?.message || e);
    }
  }
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.features_update',
    objectType: 'site_settings',
    objectId: 'site_capabilities',
    summary: '更新站点功能开关',
    before,
    after,
    result: 'success',
  });
  return { data: after, message: '功能开关已更新' };
}

module.exports = {
  getSiteCapabilities,
  getShippingSettings,
  updateShippingSettings,
  updateSiteCapabilities,
  getSiteSettings,
  updateSiteSettings,
  uploadSiteAsset,
  selectSiteSettingValue,
  upsertSiteSetting,
};
