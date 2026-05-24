module.exports = {
  async down(query) {
    await query(`
      UPDATE audit_logs
      SET object_id = LEFT(object_id, 36)
      WHERE object_id IS NOT NULL AND CHAR_LENGTH(object_id) > 36
    `);

    await query(`
      ALTER TABLE audit_logs
      MODIFY object_id VARCHAR(36) DEFAULT NULL
    `);
  },
};
