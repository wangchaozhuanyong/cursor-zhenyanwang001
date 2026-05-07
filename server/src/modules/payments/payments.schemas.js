const { z } = require('zod');

const listChannelsQuerySchema = z.object({
  country: z.string().trim().max(8).optional(),
  currency: z.string().trim().max(8).optional(),
});

const createIntentBodySchema = z.object({
  order_id: z.string().trim().min(1),
  channel_code: z.string().trim().min(1).max(64),
  idempotency_key: z.string().trim().max(128).optional(),
  return_url: z.string().trim().max(512).optional(),
});

const paymentOrderIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

const markPaidBodySchema = z.object({
  reason: z.string().trim().max(512).optional(),
  channel_code: z.string().trim().max(64).optional(),
});

const updateChannelBodySchema = z.object({
  name: z.string().trim().max(128).optional(),
  enabled: z.coerce.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
  environment: z.enum(['live', 'sandbox']).optional(),
  config_json: z.record(z.string(), z.any()).optional(),
});

const listAdminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().trim().max(32).optional(),
  channelCode: z.string().trim().max(64).optional(),
  keyword: z.string().trim().max(128).optional(),
  orderId: z.string().trim().optional(),
  /** 支付事件列表筛选 */
  provider: z.string().trim().max(32).optional(),
});

const createReconciliationBodySchema = z.object({
  reconcile_date: z.string().trim().min(1),
  provider: z.string().trim().min(1).max(32),
  channel_code: z.string().trim().max(64).optional(),
  diff_amount: z.coerce.number().optional(),
  notes: z.string().trim().max(512).optional(),
});

const webhookManualBodySchema = z.object({
  order_id: z.string().trim().min(1),
  /** 也可通过请求头 X-Webhook-Secret 传递 */
  secret: z.string().trim().optional(),
});

const adminChannelIdParamSchema = z.object({ id: z.string().trim().min(1) });
const adminOrderIdParamSchema = z.object({ orderId: z.string().trim().min(1) });
const adminEventIdParamSchema = z.object({ eventId: z.string().trim().min(1) });

const webhookProviderParamSchema = z.object({
  provider: z.enum(['manual']),
});

module.exports = {
  listChannelsQuerySchema,
  createIntentBodySchema,
  paymentOrderIdParamSchema,
  markPaidBodySchema,
  updateChannelBodySchema,
  listAdminQuerySchema,
  createReconciliationBodySchema,
  webhookManualBodySchema,
  adminChannelIdParamSchema,
  adminOrderIdParamSchema,
  adminEventIdParamSchema,
  webhookProviderParamSchema,
};
