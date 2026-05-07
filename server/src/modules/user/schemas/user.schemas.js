const { z } = require('zod');

const idParam = z.string().trim().min(1);

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const addressIdParamSchema = z.object({ id: idParam });

const addressBaseSchema = z.object({
  receiver: z.string().trim().min(1, '请填写收件人').max(64),
  phone: z.string().trim().min(6, '收件人电话不正确').max(20),
  region: z.string().trim().max(128).optional(),
  detail: z.string().trim().min(1, '请填写详细地址').max(512),
  is_default: z.coerce.boolean().optional(),
});

const createAddressBodySchema = addressBaseSchema;
const updateAddressBodySchema = addressBaseSchema.partial();
const productIdParamSchema = z.object({ productId: idParam });

const addFavoriteBodySchema = z
  .union([
    z.object({ product_id: idParam }),
    z.object({ productId: idParam }),
  ])
  .transform((v) => ({
    product_id: 'product_id' in v ? v.product_id : v.productId,
  }));

const addHistoryBodySchema = z
  .union([
    z.object({ product_id: idParam }),
    z.object({ productId: idParam }),
  ])
  .transform((v) => ({
    product_id: 'product_id' in v ? v.product_id : v.productId,
  }));

const pointsListQuerySchema = paginationQuerySchema;
const notificationIdParamSchema = z.object({ id: idParam });

const notificationListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['order', 'system', 'marketing', 'invite']).optional(),
});

const claimCouponBodySchema = z
  .union([
    z.object({ code: z.string().trim().min(1) }),
    z.object({ couponId: idParam }),
  ])
  .transform((v) => ({
    code: 'code' in v ? v.code : v.couponId,
  }));

const withdrawBodySchema = z
  .object({
    amount: z.coerce.number().positive('金额必须大于 0'),
    method: z.string().trim().max(32).optional(),
    channel: z.string().trim().max(32).optional(),
    account: z.string().trim().max(128).optional(),
  })
  .transform((v) => ({
    amount: v.amount,
    channel: v.channel ?? v.method,
    account: v.account,
  }));

const shippingQuoteBodySchema = z.object({
  shipping_template_id: idParam,
  raw_amount: z.coerce.number().nonnegative('raw_amount 无效'),
  estimated_weight_kg: z.coerce.number().nonnegative().optional(),
});

module.exports = {
  paginationQuerySchema,
  addressIdParamSchema,
  createAddressBodySchema,
  updateAddressBodySchema,
  productIdParamSchema,
  addFavoriteBodySchema,
  addHistoryBodySchema,
  pointsListQuerySchema,
  notificationIdParamSchema,
  notificationListQuerySchema,
  claimCouponBodySchema,
  withdrawBodySchema,
  shippingQuoteBodySchema,
};
