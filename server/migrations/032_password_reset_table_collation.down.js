module.exports = {
  async down(query) {
    await query(`
      ALTER TABLE password_reset_tokens
      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
    `).catch(() => {});
  },
};
