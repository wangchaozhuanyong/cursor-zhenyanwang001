module.exports = async function up(db) {
  // Add viewed_at for correct ordering and cleanup logic in history.repository.js
  await db.query(`
    ALTER TABLE browsing_history
    ADD COLUMN viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  `);

  // Backfill from created_at for existing rows
  await db.query(`
    UPDATE browsing_history
    SET viewed_at = created_at
    WHERE viewed_at IS NULL
  `);

  await db.query(`
    ALTER TABLE browsing_history
    ADD INDEX idx_bh_user_viewed (user_id, viewed_at)
  `);
};

