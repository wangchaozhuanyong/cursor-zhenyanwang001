const { z } = require('zod');
const { ORDER_STATUS } = require('../../../constants/status');

const idParam = z.string().trim().min(1);

const adminOrderIdParamsSchema = z.object({ id: idParam });

const adminUpdateOrderStatusBodySchema = z.object({
  status: z.enum([
    ORDER_STATUS.PENDING,
    ORDER_STATUS.PAID,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.REFUNDING,
    ORDER_STATUS.REFUNDED,
  ]),
  remark: z.string().trim().max(512).optional(),
});

const adminShipOrderBodySchema = z.object({
  trackingNo: z.string().trim().max(128).optional(),
  tracking_no: z.string().trim().max(128).optional(),
  carrier: z.string().trim().max(64).optional(),
  shipping_cost_amount: z.coerce.number().min(0).max(9999999).optional(),
});

const adminBatchShipBodySchema = z.object({
  order_ids: z.array(idParam).min(1, 'order_ids 不能为空'),
  carrier: z.string().trim().min(1, 'carrier 不能为空').max(64),
  tracking_map: z.record(z.string(), z.string().trim().min(1)).optional(),
});

const shortageAdjustmentItemSchema = z.object({
  order_item_id: idParam,
  after_qty: z.coerce.number().int().min(0),
  shortage_reason: z.string().trim().max(255).optional(),
  correct_stock_zero: z.boolean().optional(),
});

const adminShortageAdjustmentBodySchema = z.object({
  reason: z.string().trim().min(1, '调整原因不能为空').max(500),
  customer_confirmed: z.boolean().optional().default(false),
  customer_confirm_method: z.string().trim().max(64).optional().default(''),
  customer_confirm_note: z.string().trim().max(500).optional().default(''),
  stock_handling: z.enum(['no_restore', 'correct_zero']).optional().default('no_restore'),
  items: z.array(shortageAdjustmentItemSchema).min(1, '请至少选择一个缺货商品'),
});

module.exports = {
  adminOrderIdParamsSchema,
  adminUpdateOrderStatusBodySchema,
  adminShipOrderBodySchema,
  adminBatchShipBodySchema,
  adminShortageAdjustmentBodySchema,
};
