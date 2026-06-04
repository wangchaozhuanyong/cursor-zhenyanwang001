const { z } = require('zod');

const feedbackIdParamSchema = z.object({
  id: z.string().trim().min(1, '反馈 ID 不能为空'),
});

const adminFeedbackListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().max(200).optional(),
  status: z.enum(['all', 'pending', 'in_progress', 'resolved', 'dismissed']).optional(),
  type: z.enum(['all', 'suggestion', 'bug', 'order', 'payment', 'account', 'other']).optional(),
  userId: z.string().trim().max(64).optional(),
  dateFrom: z.string().trim().max(32).optional(),
  dateTo: z.string().trim().max(32).optional(),
});

const updateAdminFeedbackBodySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'resolved', 'dismissed']).optional(),
  handlerNote: z.string().trim().max(2000, '处理备注最多 2000 个字').optional(),
  handler_note: z.string().trim().max(2000, '处理备注最多 2000 个字').optional(),
}).refine(
  (value) => value.status !== undefined || value.handlerNote !== undefined || value.handler_note !== undefined,
  { message: '没有需要更新的内容' },
).transform((value) => ({
  status: value.status,
  handler_note: value.handler_note ?? value.handlerNote,
}));

module.exports = {
  feedbackIdParamSchema,
  adminFeedbackListQuerySchema,
  updateAdminFeedbackBodySchema,
};
