/**
 * Cart 模块入参 Schemas
 */
import { z } from 'zod';

export const productIdParamSchema = z.object({
  productId: z.string().trim().min(1, '商品ID不能为空'),
});

export const addToCartBodySchema = z.object({
  productId: z.string().trim().min(1, '商品ID不能为空'),
  qty: z.coerce.number().int().min(1, '数量至少为 1').max(9999).default(1),
});

export const updateCartItemBodySchema = z.object({
  qty: z.coerce.number().int().min(1, '数量至少为 1').max(9999),
});

export type AddToCartBody = z.infer<typeof addToCartBodySchema>;
export type UpdateCartItemBody = z.infer<typeof updateCartItemBodySchema>;
