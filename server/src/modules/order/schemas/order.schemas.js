const { z } = require('zod');

const idParam = z.string().trim().min(1);

const orderIdParamSchema = z.object({ id: idParam });

const orderItemSchema = z.object({
  product_id: idParam,
  qty: z.coerce.number().int().min(1).max(9999),
});

const createOrderBodySchema = z.object({
  items: z.array(orderItemSchema).min(1, '订单商品不能为空'),
  contact_name: z.string().trim().min(1, '联系人姓名不能为空').max(64),
  contact_phone: z.string().trim().min(6, '联系人电话不正确').max(20),
  address: z.string().trim().max(512).optional(),
  note: z.string().trim().max(512).optional(),
  coupon_id: idParam.optional(),
  coupon_title: z.string().trim().max(64).optional(),
  shipping_template_id: idParam.optional(),
  shipping_name: z.string().trim().max(64).optional(),
  payment_method: z
    .enum(['online', 'offline', 'manual', 'mock', 'cash', 'bank_transfer'])
    .optional(),
  estimated_weight_kg: z.coerce.number().nonnegative().optional(),
});

const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z
    .enum([
      'pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunding', 'refunded',
    ])
    .optional(),
});

const payOrderBodySchema = z.object({
  channel: z.string().trim().max(32).optional(),
});

const createReturnBodySchema = z.object({
  order_id: idParam,
  reason: z.string().trim().min(1, '请填写退款原因').max(512),
  type: z.enum(['refund', 'return_refund']).default('refund'),
  amount: z.coerce.number().nonnegative().optional(),
  contact_phone: z.string().trim().max(20).optional(),
  proof_images: z.array(z.string().trim().max(512)).max(20).optional(),
});

const listReturnsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

module.exports = {
  orderIdParamSchema,
  createOrderBodySchema,
  listOrdersQuerySchema,
  payOrderBodySchema,
  createReturnBodySchema,
  listReturnsQuerySchema,
};
