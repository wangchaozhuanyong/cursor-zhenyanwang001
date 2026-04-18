const repo = require('./adminSiteSettings.repository');
const { writeAuditLog } = require('../../utils/auditLog');

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

module.exports = {
  getShippingSettings,
  updateShippingSettings,
  getSiteSettings,
  updateSiteSettings,
};
