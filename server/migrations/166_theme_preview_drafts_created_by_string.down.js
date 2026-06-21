module.exports = {
  async down() {
    // No safe rollback: existing preview drafts may contain string admin user IDs.
  },
};
