const { z } = require('zod');

const idParam = z.string().trim().min(1);

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const addressIdParamSchema = z.object({ id: idParam });

function normalizeAddressPayload(v) {
  return {
    name: v.name ?? v.receiver,
    phone: v.phone,
    address: v.address ?? v.detail,
    isDefault: v.isDefault ?? v.is_default,
  };
}

const addressCreateInputSchema = z.object({
  name: z.string().trim().min(1, '请填写收件人').max(64).optional(),
  receiver: z.string().trim().min(1, '请填写收件人').max(64).optional(),
  phone: z.string().trim().min(6, '收件人电话不正确').max(20),
  address: z.string().trim().min(1, '请填写详细地址').max(512).optional(),
  detail: z.string().trim().min(1, '请填写详细地址').max(512).optional(),
  isDefault: z.coerce.boolean().optional(),
  is_default: z.coerce.boolean().optional(),
});

const createAddressBodySchema = addressCreateInputSchema
  .refine((v) => Boolean(v.name || v.receiver), { message: '请填写收件人', path: ['name'] })
  .refine((v) => Boolean(v.address || v.detail), { message: '请填写详细地址', path: ['address'] })
  .transform(normalizeAddressPayload);

const updateAddressBodySchema = addressCreateInputSchema
  .partial()
  .refine(
    (v) =>
      v.name !== undefined
      || v.receiver !== undefined
      || v.phone !== undefined
      || v.address !== undefined
      || v.detail !== undefined
      || v.isDefault !== undefined
      || v.is_default !== undefined,
    { message: '没有需要更新的字段', path: [] },
  )
  .transform(normalizeAddressPayload);
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
  type: z.enum(['system', 'order', 'shipping', 'payment', 'refund', 'after_sale', 'promotion', 'coupon', 'points', 'reward']).optional(),
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
    amount: z.coerce.number().positive('提现金额必须大于 0'),
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
  shipping_template_id: z.coerce.string().trim().min(1).optional(),
  raw_amount: z.coerce.number().nonnegative('raw_amount 不能为负数'),
  estimated_weight_kg: z.coerce.number().nonnegative().optional(),
});

const cancelAccountBodySchema = z.object({
  confirmText: z.string().trim().min(1, '请输入确认文本'),
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
  cancelAccountBodySchema,
};
