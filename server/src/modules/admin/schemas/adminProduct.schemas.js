const { z } = require('zod');

const lifecycleStatusSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);

const variantInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(255).optional(),
  sku_code: z.union([z.string().max(64), z.null()]).optional(),
  price: z.coerce.number().nonnegative(),
  stock: z.coerce.number().int().nonnegative(),
  sort_order: z.coerce.number().int().optional(),
  is_default: z.boolean().optional(),
});

const adminProductListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  keyword: z.string().max(200).optional(),
  category_id: z.string().max(36).optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
});

const adminProductCreateBodySchema = z.object({
  name: z.string().min(1).max(255),
  cover_image: z.string().max(500).optional(),
  video_url: z.string().max(2000).optional(),
  images: z.array(z.string().max(2000)).max(20).optional().default([]),
  price: z.coerce.number().nonnegative(),
  original_price: z.union([z.coerce.number(), z.null()]).optional(),
  sales_count: z.coerce.number().int().nonnegative().optional(),
  points: z.coerce.number().int().nonnegative().optional(),
  category_id: z.union([z.string().max(36), z.literal('')]).optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
  lifecycle_status: lifecycleStatusSchema.optional(),
  sort_order: z.coerce.number().int().optional(),
  description: z.string().max(100000).optional(),
  is_recommended: z.boolean().optional(),
  is_new: z.boolean().optional(),
  is_hot: z.boolean().optional(),
  variants: z.array(variantInputSchema).max(30).optional(),
  tag_ids: z.array(z.string().uuid()).max(30).optional(),
});

const adminProductUpdateBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  cover_image: z.string().max(500).optional(),
  video_url: z.string().max(2000).optional(),
  images: z.array(z.string().max(2000)).max(20).optional(),
  price: z.coerce.number().nonnegative().optional(),
  original_price: z.union([z.coerce.number(), z.null()]).optional(),
  sales_count: z.coerce.number().int().nonnegative().optional(),
  points: z.coerce.number().int().nonnegative().optional(),
  category_id: z.union([z.string().max(36), z.literal(''), z.null()]).optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
  lifecycle_status: lifecycleStatusSchema.optional(),
  sort_order: z.coerce.number().int().optional(),
  description: z.string().max(100000).optional(),
  is_recommended: z.boolean().optional(),
  is_new: z.boolean().optional(),
  is_hot: z.boolean().optional(),
  variants: z.array(variantInputSchema).max(30).optional(),
  tag_ids: z.array(z.string().uuid()).max(30).optional(),
}).refine((o) => Object.keys(o).length > 0, { message: '没有需要更新的字段' });

const adminProductPatchStatusBodySchema = z.object({
  lifecycle_status: z.number().int().min(0).max(2),
});

const adminProductBatchStatusBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  status: z.enum(['active', 'inactive', 'draft']),
});

const adminProductIdParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  adminProductListQuerySchema,
  adminProductCreateBodySchema,
  adminProductUpdateBodySchema,
  adminProductPatchStatusBodySchema,
  adminProductBatchStatusBodySchema,
  adminProductIdParamsSchema,
  variantInputSchema,
};
