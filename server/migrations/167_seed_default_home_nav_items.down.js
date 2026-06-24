const DEFAULT_HOME_NAV_ITEM_IDS = [
  'seed-quick-tobacco',
  'seed-quick-categories',
  'seed-quick-wine',
  'seed-quick-renovation',
  'seed-quick-invite',
  'seed-quick-authentic',
  'seed-quick-bedding',
  'seed-quick-visa',
  'seed-quick-mm2h',
  'seed-quick-study',
];

async function tableExists(query, table) {
  const [rows] = await query('SHOW TABLES LIKE ?', [table]);
  return rows.length > 0;
}

module.exports = {
  async down(query) {
    if (!(await tableExists(query, 'home_nav_items'))) return;
    const placeholders = DEFAULT_HOME_NAV_ITEM_IDS.map(() => '?').join(', ');
    await query(`DELETE FROM home_nav_items WHERE id IN (${placeholders})`, DEFAULT_HOME_NAV_ITEM_IDS);
  },
};
