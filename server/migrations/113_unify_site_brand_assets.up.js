/** 站点 Logo / Favicon 统一为一套品牌图，避免旧图标继续从数据库返回。 */
module.exports = {
  async up(query) {
    const [rows] = await query(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('logoUrl', 'faviconUrl')",
    );
    const settings = {};
    for (const row of rows || []) {
      settings[row.setting_key] = String(row.setting_value || '').trim();
    }

    const unified = settings.logoUrl || settings.faviconUrl;
    if (!unified) return;

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('logoUrl', ?), ('faviconUrl', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), version = version + 1`,
      [unified, unified],
    );

    await query(
      `UPDATE audit_logs
       SET before_json = JSON_REMOVE(before_json, '$.logoUrl', '$.faviconUrl'),
           after_json = JSON_REMOVE(after_json, '$.logoUrl', '$.faviconUrl')
       WHERE object_type = 'site_settings'
         AND action_type IN ('settings.site_update', 'settings.site_asset_upload')`,
    );
  },
};
