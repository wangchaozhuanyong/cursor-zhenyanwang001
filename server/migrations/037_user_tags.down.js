module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS user_tag_assignments');
    await query('DROP TABLE IF EXISTS user_tags');
  },
};
