const TABLES = ['banners', 'notifications', 'content_pages'];

module.exports = {
  async down(query) {
    for (const table of TABLES) {
      for (const col of ['last_modified_at', 'last_modified_by', 'publish_status']) {
        try { await query(`ALTER TABLE ${table} DROP COLUMN ${col}`); } catch { /* ignore */ }
      }
    }
  },
};
