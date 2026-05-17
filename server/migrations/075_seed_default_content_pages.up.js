const { generateId } = require('../src/utils/helpers');

/** 默认 CMS 页面：已存在同 slug 则跳过，不覆盖后台编辑内容 */
const DEFAULT_PAGES = [
  {
    slug: 'privacy-policy',
    title: '隐私政策',
    body: '本隐私政策说明我们如何依据马来西亚 Personal Data Protection Act 2010（PDPA）收集、使用、保存、披露和保护您的个人资料。详情请以后台「内容管理」中最新版本为准。',
  },
  {
    slug: 'terms',
    title: '服务条款',
    body: '使用本网站即表示您同意本服务条款。商品信息、价格与配送说明以提交订单时页面显示为准。',
  },
  {
    slug: 'refund-policy',
    title: '退货与退款政策',
    body: '退货、退款和换货以订单商品行为单位处理。请在售后期限内通过订单页提交售后申请。',
  },
  {
    slug: 'shipping-policy',
    title: '配送政策',
    body: '我们配送范围以马来西亚为主，运费根据收货地址与订单金额由系统计算。',
  },
  {
    slug: 'contact-us',
    title: '联系我们',
    body: [
      '如需订单、支付、物流、退货退款、隐私资料导出或账号删除协助，请通过下方联系方式与我们取得联系。',
      '联系客服时请提供订单号、注册手机号、问题说明和相关截图。涉及退款或物流争议时，请保留商品、包装和承运商凭证。',
      '客服通常会在工作日优先处理已付款订单和售后申请。紧急支付异常请同时提供支付时间、金额和支付渠道。',
    ].join('\n\n'),
  },
];

module.exports = {
  async up(query) {
    for (const page of DEFAULT_PAGES) {
      const [rows] = await query(
        'SELECT id FROM content_pages WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
        [page.slug],
      );
      if (rows?.length) continue;

      await query(
        `INSERT INTO content_pages (id, slug, title, body, publish_status, last_modified_at)
         VALUES (?, ?, ?, ?, 'published', NOW())`,
        [generateId(), page.slug, page.title, page.body],
      );
    }
  },
};
