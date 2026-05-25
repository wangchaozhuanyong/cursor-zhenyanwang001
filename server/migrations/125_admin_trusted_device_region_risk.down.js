module.exports = {
  async down(query) {
    await query('ALTER TABLE admin_trusted_devices DROP COLUMN last_region_hash').catch(() => {});
    await query('ALTER TABLE admin_trusted_devices DROP COLUMN trusted_region_hash').catch(() => {});
  },
};
