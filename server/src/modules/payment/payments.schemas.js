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
  payment_channel: z.string().trim().max(64).optional(),
  payment_reference: z.string().trim().max(128).optional(),
  admin_remark: z.string().trim().max(512).optional(),
});

const refundBodySchema = z.object({
  amount: z.coerce.number().positive('退款金额必须大于 0'),
  reason: z.string().trim().max(512).optional(),
  refund_reference: z.string().trim().max(128).optional(),
  mode: z.enum(['manual', 'provider']).default('manual'),
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
  provider: z.string().trim().max(32).optional(),
  eventType: z.string().trim().max(64).optional(),
  verifyStatus: z.string().trim().max(24).optional(),
  processingResult: z.string().trim().max(32).optional(),
  reviewStatus: z.string().trim().max(24).optional(),
});

const createReconciliationBodySchema = z.object({
  reconcile_date: z.string().trim().min(1),
  provider: z.string().trim().min(1).max(32),
  channel_code: z.string().trim().max(64).optional(),
  diff_amount: z.coerce.number().optional(),
  provider_report_amount: z.coerce.number().optional(),
  provider_fee_amount: z.coerce.number().optional(),
  provider_reference: z.string().trim().max(128).optional(),
  difference_reason: z.string().trim().max(512).optional(),
  notes: z.string().trim().max(512).optional(),
});

const reviewPaymentEventBodySchema = z.object({
  review_status: z.enum(['pending', 'needs_review', 'confirmed', 'needs_followup', 'rejected', 'ignored']).default('confirmed'),
  review_note: z.string().trim().max(512).optional(),
  notes: z.string().trim().max(512).optional(),
});

const reviewReconciliationBodySchema = z.object({
  review_status: z.enum(['confirmed', 'needs_followup', 'rejected', 'ignored']).default('confirmed'),
  review_notes: z.string().trim().max(512).optional(),
  review_note: z.string().trim().max(512).optional(),
  notes: z.string().trim().max(512).optional(),
  difference_reason: z.string().trim().max(512).optional(),
});

const webhookProviderBodySchema = z.object({
  order_id: z.string().trim().min(1).optional(),
  payment_order_id: z.string().trim().min(1).optional(),
  event_id: z.string().trim().max(191).optional(),
  transaction_id: z.string().trim().max(191).optional(),
  reference: z.string().trim().max(191).optional(),
  status: z.string().trim().max(64).optional(),
  payment_status: z.string().trim().max(64).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().trim().max(8).optional(),
  channel_code: z.string().trim().max(64).optional(),
  secret: z.string().trim().optional(),
  signature: z.string().trim().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  ts: z.union([z.string(), z.number()]).optional(),
  nonce: z.string().trim().optional(),
}).passthrough();

const adminChannelIdParamSchema = z.object({ id: z.string().trim().min(1) });
const adminOrderIdParamSchema = z.object({ orderId: z.string().trim().min(1) });
const adminEventIdParamSchema = z.object({ eventId: z.string().trim().min(1) });
const adminReconciliationIdParamSchema = z.object({ id: z.string().trim().min(1) });

const webhookProviderParamSchema = z.object({
  provider: z.enum(['manual', 'malaysia-local', 'malaysia_local', 'billplz', 'fpx']),
});

module.exports = {
  listChannelsQuerySchema,
  createIntentBodySchema,
  paymentOrderIdParamSchema,
  markPaidBodySchema,
  refundBodySchema,
  updateChannelBodySchema,
  listAdminQuerySchema,
  createReconciliationBodySchema,
  reviewPaymentEventBodySchema,
  reviewReconciliationBodySchema,
  webhookManualBodySchema: webhookProviderBodySchema,
  adminChannelIdParamSchema,
  adminOrderIdParamSchema,
  adminEventIdParamSchema,
  adminReconciliationIdParamSchema,
  webhookProviderParamSchema,
};
