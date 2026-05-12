module.exports = async function down(db) {
  await db.query(`
    ALTER TABLE browsing_history
    DROP INDEX idx_bh_user_viewed
  `);

  await db.query(`
    ALTER TABLE browsing_history
    DROP COLUMN viewed_at
  `);
};

