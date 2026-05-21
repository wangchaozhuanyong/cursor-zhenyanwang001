module.exports = {
  async up(query) {
    // Add viewed_at for correct ordering and cleanup logic in history.repository.js
    try {
      await query(`
        ALTER TABLE browsing_history
        ADD COLUMN viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `);
    } catch (err) {
      if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    // Backfill from created_at for existing rows
    await query(`
      UPDATE browsing_history
      SET viewed_at = created_at
      WHERE viewed_at IS NULL
    `);

    try {
      await query(`
        ALTER TABLE browsing_history
        ADD INDEX idx_bh_user_viewed (user_id, viewed_at)
      `);
    } catch (err) {
      if (err?.code !== 'ER_DUP_KEYNAME') throw err;
    }
  },
};
