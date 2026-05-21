module.exports = {
  async down(query) {
    await query(`
      ALTER TABLE home_nav_items
        DROP COLUMN target_support_channel_id
    `).catch(() => {});
  },
};
