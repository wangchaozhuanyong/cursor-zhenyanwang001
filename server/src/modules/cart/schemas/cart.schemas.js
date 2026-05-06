const { z } = require('zod');

const productIdParamSchema = z.object({
  productId: z.string().trim().min(1, '商品ID不能为空'),
});

const addToCartBodySchema = z.object({
  productId: z.string().trim().min(1, '商品ID不能为空'),
  qty: z.coerce.number().int().min(1, '数量至少为 1').max(9999).default(1),
});

const updateCartItemBodySchema = z.object({
  qty: z.coerce.number().int().min(1, '数量至少为 1').max(9999),
});

module.exports = {
  productIdParamSchema,
  addToCartBodySchema,
  updateCartItemBodySchema,
};
