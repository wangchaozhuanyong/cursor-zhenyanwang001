module.exports = {
  async up(query) {
    try {
      await query(
        'ALTER TABLE users ADD COLUMN refresh_token_version INT NOT NULL DEFAULT 0',
      );
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
  },
};
