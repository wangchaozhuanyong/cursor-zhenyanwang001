const {
  LEGACY_IM_KEYS,
  migrateSupportSettings,
  stripHelpCenterConfig,
} = require('../src/data/supportDownloadMigration');

/**
 * 1. 将 contactWhatsApp / whatsappUrl / wechatId / businessHours 合并进 supportDownloadConfig
 * 2. 从 helpCenterConfig 移除 workingHours、contactNote
 * 3. 删除已迁移的遗留 IM 字段
 */
module.exports = {
  async up(query) {
    const keys = [
      'supportDownloadConfig',
      'helpCenterConfig',
      ...LEGACY_IM_KEYS,
    ];
    const placeholders = keys.map(() => '?').join(', ');
    const [rows] = await query(
      `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (${placeholders})`,
      keys,
    );

    const settings = {};
    for (const row of rows || []) {
      settings[row.setting_key] = String(row.setting_value ?? '');
    }

    const { supportDownloadConfig } = migrateSupportSettings(settings);
    const supportJson = JSON.stringify(supportDownloadConfig);

    await query(
      `INSERT INTO site_settings (setting_key, setting_value, updated_at)
       VALUES ('supportDownloadConfig', ?, NOW())
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(), version = version + 1`,
      [supportJson],
    );

    const helpStrip = stripHelpCenterConfig(settings.helpCenterConfig);
    if (helpStrip.json && helpStrip.changed) {
      await query(
        `UPDATE site_settings SET setting_value = ?, updated_at = NOW(), version = version + 1
         WHERE setting_key = 'helpCenterConfig'`,
        [JSON.stringify(helpStrip.json)],
      );
    }

    if (LEGACY_IM_KEYS.length > 0) {
      const legacyPlaceholders = LEGACY_IM_KEYS.map(() => '?').join(', ');
      await query(
        `DELETE FROM site_settings WHERE setting_key IN (${legacyPlaceholders})`,
        LEGACY_IM_KEYS,
      );
    }
  },
};
