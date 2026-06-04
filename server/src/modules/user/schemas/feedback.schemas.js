const { z } = require('zod');

const FEEDBACK_TYPES = ['suggestion', 'bug', 'order', 'payment', 'account', 'other'];

function emptyToUndefined(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

const submitFeedbackBodySchema = z.object({
  type: z.enum(FEEDBACK_TYPES).default('other'),
  title: z.preprocess(emptyToUndefined, z.string().trim().max(120, '标题最多 120 个字').optional()),
  content: z.string().trim().min(10, '请至少填写 10 个字，方便我们判断问题').max(2000, '反馈内容最多 2000 个字'),
  contact: z.preprocess(emptyToUndefined, z.string().trim().max(120, '联系方式最多 120 个字').optional()),
  orderNo: z.preprocess(emptyToUndefined, z.string().trim().max(64, '订单号最多 64 个字符').optional()),
  order_no: z.preprocess(emptyToUndefined, z.string().trim().max(64, '订单号最多 64 个字符').optional()),
  pageUrl: z.preprocess(emptyToUndefined, z.string().trim().max(500, '来源页面最多 500 个字符').optional()),
  page_url: z.preprocess(emptyToUndefined, z.string().trim().max(500, '来源页面最多 500 个字符').optional()),
}).transform((value) => ({
  type: value.type,
  title: value.title || '',
  content: value.content,
  contact: value.contact || '',
  order_no: value.order_no || value.orderNo || '',
  page_url: value.page_url || value.pageUrl || '',
}));

const myFeedbackListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(5),
});

module.exports = {
  FEEDBACK_TYPES,
  myFeedbackListQuerySchema,
  submitFeedbackBodySchema,
};
