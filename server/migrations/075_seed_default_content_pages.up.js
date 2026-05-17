const { generateId } = require('../src/utils/helpers');

// Seed default CMS pages if missing; never overwrite existing content.
const DEFAULT_PAGES = [
  {
    slug: 'about',
    title: '关于我们',
    body: '在这里填写关于我们内容。可在后台「内容管理」继续编辑。',
  },
  {
    slug: 'privacy-policy',
    title: '隐私政策',
    body: '请在后台「内容管理」中维护隐私政策正文。',
  },
  {
    slug: 'terms-of-service',
    title: '服务条款',
    body: '请在后台「内容管理」中维护服务条款正文。',
  },
  {
    slug: 'refund-policy',
    title: '退款政策',
    body: '请在后台「内容管理」中维护退款政策正文。',
  },
  {
    slug: 'shipping-policy',
    title: '配送政策',
    body: '请在后台「内容管理」中维护配送政策正文。',
  },
  {
    slug: 'contact-us',
    title: '联系我们',
    body: '请在后台「内容管理」中维护联系我们正文。',
  },
];

module.exports = {
  async up(query) {
    for (const page of DEFAULT_PAGES) {
      // eslint-disable-next-line no-await-in-loop
      const [rows] = await query(
        'SELECT id FROM content_pages WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
        [page.slug],
      );
      if (rows?.length) continue;

      // eslint-disable-next-line no-await-in-loop
      await query(
        `INSERT INTO content_pages (id, slug, title, body, publish_status, last_modified_at)
         VALUES (?, ?, ?, ?, 'published', NOW())`,
        [generateId(), page.slug, page.title, page.body],
      );
    }
  },
};
