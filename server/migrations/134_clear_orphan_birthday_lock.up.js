async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

module.exports = {
  async up(query) {
    if (!(await hasColumn(query, 'users', 'birthday_locked'))) return;

    await query(`
      UPDATE users
         SET birthday_locked = 0
       WHERE birthday_locked = 1
         AND (
           birthday IS NULL
           OR TRIM(birthday) = ''
           OR birthday NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
         )
         AND deleted_at IS NULL
    `);
  },
};
