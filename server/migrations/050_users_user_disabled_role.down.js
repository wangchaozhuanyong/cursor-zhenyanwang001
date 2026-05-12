module.exports = {
  async down(query) {
    await query(
      `UPDATE users
         SET role = 'disabled'
       WHERE role = 'user_disabled'`,
    ).catch(() => {});
  },
};

