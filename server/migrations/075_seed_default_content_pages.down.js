/** 仅删除本迁移插入的默认页（按 slug；若后台已改版仍保留记录） */
const SLUGS = ['privacy-policy', 'terms', 'refund-policy', 'shipping-policy', 'contact-us'];

module.exports = {
  async down(query) {
    for (const slug of SLUGS) {
      await query('DELETE FROM content_pages WHERE slug = ?', [slug]);
    }
  },
};
