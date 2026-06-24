async function tableExists(query, table) {
  const [rows] = await query('SHOW TABLES LIKE ?', [table]);
  return rows.length > 0;
}

const DEFAULT_HOME_NAV_ITEMS = [
  {
    id: 'seed-quick-tobacco',
    icon: 'tobacco',
    title: '正品烟草',
    link: '/categories?keyword=%E7%83%9F%E8%8D%89',
    targetType: 'url',
  },
  {
    id: 'seed-quick-categories',
    icon: 'categories',
    title: '全部分类',
    link: '/categories',
    targetType: 'categories',
  },
  {
    id: 'seed-quick-wine',
    icon: 'wine',
    title: '正品酒水',
    link: '/categories?keyword=%E9%85%92%E6%B0%B4',
    targetType: 'url',
  },
  {
    id: 'seed-quick-renovation',
    icon: 'renovation',
    title: '装修服务',
    link: '/about',
    targetType: 'url',
  },
  {
    id: 'seed-quick-invite',
    icon: 'invite',
    title: '邀请返现',
    link: '/invite',
    targetType: 'url',
  },
  {
    id: 'seed-quick-authentic',
    icon: 'authentic',
    title: '正厂货物',
    link: '/categories?sort=sales_desc',
    targetType: 'url',
  },
  {
    id: 'seed-quick-bedding',
    icon: 'bedding',
    title: '床上用品',
    link: '/categories?keyword=%E5%BA%8A%E4%B8%8A%E7%94%A8%E5%93%81',
    targetType: 'url',
  },
  {
    id: 'seed-quick-visa',
    icon: 'visa',
    title: '签证办理',
    link: '/about',
    targetType: 'url',
  },
  {
    id: 'seed-quick-mm2h',
    icon: 'mm2h',
    title: '第二家园',
    link: '/about',
    targetType: 'url',
  },
  {
    id: 'seed-quick-study',
    icon: 'study',
    title: '留学办理',
    link: '/about',
    targetType: 'url',
  },
];

module.exports = {
  async up(query) {
    if (!(await tableExists(query, 'home_nav_items'))) return;

    const [[row]] = await query('SELECT COUNT(*) AS total FROM home_nav_items');
    if (Number(row?.total || 0) > 0) return;

    const values = DEFAULT_HOME_NAV_ITEMS.flatMap((item, index) => [
      item.id,
      item.icon,
      item.title,
      item.link,
      item.targetType,
      null,
      null,
      (index + 1) * 10,
      1,
    ]);
    const placeholders = DEFAULT_HOME_NAV_ITEMS.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');

    await query(
      `INSERT IGNORE INTO home_nav_items
        (id, icon_url, title, link_url, target_type, target_category_id, target_support_channel_id, sort_order, enabled)
       VALUES ${placeholders}`,
      values,
    );
  },
};
