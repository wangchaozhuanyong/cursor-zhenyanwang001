module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE admin_trusted_devices
        ADD COLUMN trusted_region_hash VARCHAR(128) NOT NULL DEFAULT '' AFTER last_ip_hash
    `).catch((err) => {
      if (!/Duplicate column name/i.test(String(err && err.message))) throw err;
    });

    await query(`
      ALTER TABLE admin_trusted_devices
        ADD COLUMN last_region_hash VARCHAR(128) NOT NULL DEFAULT '' AFTER trusted_region_hash
    `).catch((err) => {
      if (!/Duplicate column name/i.test(String(err && err.message))) throw err;
    });
  },
};
