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
});

const adminBatchShipBodySchema = z.object({
  order_ids: z.array(idParam).min(1, 'order_ids 不能为空'),
  carrier: z.string().trim().min(1, 'carrier 不能为空').max(64),
  tracking_map: z.record(z.string(), z.string().trim().min(1)).optional(),
});

module.exports = {
  adminOrderIdParamsSchema,
  adminUpdateOrderStatusBodySchema,
  adminShipOrderBodySchema,
  adminBatchShipBodySchema,
};
