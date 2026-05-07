const repo = require('./adminSiteSettings.repository');
const { writeAuditLog } = require('../../utils/auditLog');
const sharp = require('sharp');

const SITE_ASSET_KEYS = new Set(['logoUrl', 'faviconUrl']);

function rowsToMap(rows) {
  const settings = {};
  rows.forEach((r) => {
    settings[r.setting_key] = r.setting_value;
  });
  return settings;
}

async function getShippingSettings() {
  const rows = await repo.selectShippingSettingsRows();
  return { data: rowsToMap(rows) };
}

async function updateShippingSettings(body, adminUserId, req) {
  const beforeRows = await repo.selectShippingSettingsRows();
  const beforeMap = rowsToMap(beforeRows);
  for (const [key, value] of Object.entries(body)) {
    await repo.upsertSetting(`shipping_${key}`, value);
  }
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'settings.shipping_update', objectType: 'site_settings', objectId: null, summary: '更新运费设置', before: beforeMap, after: body, result: 'success' });
  return { data: null, message: '设置已更新' };
}

async function getSiteSettings() {
  const rows = await repo.selectNonShippingSettingsRows();
  return { data: rowsToMap(rows) };
}

async function updateSiteSettings(body, adminUserId, req) {
  const beforeRows = await repo.selectNonShippingSettingsRows();
  const beforeMap = rowsToMap(beforeRows);
  try {
    for (const [key, value] of Object.entries(body)) {
      await repo.upsertSetting(key, value);
    }
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'settings.site_update',
      objectType: 'site_settings',
      objectId: null,
      summary: '更新站点基础设置',
      before: beforeMap,
      after: { ...beforeMap, ...body },
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
      before: beforeMap,
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

async function uploadSiteAsset(file, key, adminUserId, req) {
  if (!SITE_ASSET_KEYS.has(key)) {
    return { error: { code: 400, message: '不支持的站点图片字段' } };
  }
  if (!file || !file.buffer) {
    return { error: { code: 400, message: '请选择要上传的图片' } };
  }

  const beforeRows = await repo.selectNonShippingSettingsRows();
  const beforeMap = rowsToMap(beforeRows);

  const maxWidth = key === 'faviconUrl' ? 64 : 512;
  const webpBuffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: maxWidth, height: maxWidth, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: key === 'faviconUrl' ? 90 : 85 })
    .toBuffer();
  const dataUrl = `data:image/webp;base64,${webpBuffer.toString('base64')}`;

  await repo.upsertSetting(key, dataUrl);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.site_asset_upload',
    objectType: 'site_settings',
    objectId: key,
    summary: `上传站点图片 ${key}`,
    before: { [key]: beforeMap[key] || '' },
    after: { [key]: dataUrl },
    result: 'success',
  });

  return { data: { key, url: dataUrl }, message: '图片已保存到数据库' };
}

module.exports = {
  getShippingSettings,
  updateShippingSettings,
  getSiteSettings,
  updateSiteSettings,
  uploadSiteAsset,
};
