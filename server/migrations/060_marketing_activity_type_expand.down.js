module.exports = {
  async down(query) {
    await query(`
      ALTER TABLE marketing_activities
      MODIFY COLUMN type ENUM('flash_sale','full_reduction')
      NOT NULL DEFAULT 'flash_sale'
    `).catch(() => {});
  },
};

