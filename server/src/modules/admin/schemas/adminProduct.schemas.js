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
  original_price: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
  cost_price: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
  stock: z.coerce.number().int().nonnegative(),
  stock_warning_threshold: z.coerce.number().int().nonnegative().optional(),
  barcode: z.union([z.string().max(64), z.null()]).optional(),
  image_url: z.union([z.string().max(500), z.null()]).optional(),
  weight: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
  enabled: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
  is_default: z.boolean().optional(),
  spec_value_ids: z.array(z.string().max(36)).max(3).optional(),
});

const specValueInputSchema = z.object({
  id: z.string().max(36).optional(),
  value: z.string().trim().min(1).max(64),
  image_url: z.union([z.string().max(500), z.null()]).optional(),
  sort_order: z.coerce.number().int().optional(),
});

const specGroupInputSchema = z.object({
  id: z.string().max(36).optional(),
  name: z.string().trim().min(1).max(64),
  sort_order: z.coerce.number().int().optional(),
  values: z.array(specValueInputSchema).max(20).optional().default([]),
});

const adminProductListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  keyword: z.string().max(200).optional(),
  category_id: z.string().max(36).optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
  stock_status: z.enum(['normal', 'low', 'out']).optional(),
  cost_status: z.enum(['normal', 'missing']).optional(),
  min_margin: z.coerce.number().optional(),
  max_margin: z.coerce.number().optional(),
  sort: z.enum([
    'created_desc',
    'sales_30d_desc',
    'sales_amount_30d_desc',
    'gross_profit_30d_desc',
    'stock_asc',
    'stock_desc',
    'margin_asc',
    'margin_desc',
  ]).optional(),
});

const adminProductCreateBodySchema = z.object({
  name: z.string().min(1).max(255),
  cover_image: z.string().max(500).optional(),
  video_url: z.string().max(2000).optional(),
  images: z.array(z.string().max(2000)).max(20).optional().default([]),
  price: z.coerce.number().nonnegative(),
  original_price: z.union([z.coerce.number(), z.null()]).optional(),
  sales_count: z.coerce.number().int().nonnegative().optional(),
  category_id: z.union([z.string().max(36), z.literal(''), z.null()]).optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
  lifecycle_status: lifecycleStatusSchema.optional(),
  sort_order: z.coerce.number().int().optional(),
  description: z.string().max(100000).optional(),
  is_recommended: z.boolean().optional(),
  is_new: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  is_hot: z.boolean().optional(),
  spec_groups: z.array(specGroupInputSchema).max(3).optional(),
  variants: z.array(variantInputSchema).max(200).optional(),
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
  category_id: z.union([z.string().max(36), z.literal(''), z.null()]).optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
  lifecycle_status: lifecycleStatusSchema.optional(),
  sort_order: z.coerce.number().int().optional(),
  description: z.string().max(100000).optional(),
  is_recommended: z.boolean().optional(),
  is_new: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  is_hot: z.boolean().optional(),
  spec_groups: z.array(specGroupInputSchema).max(3).optional(),
  variants: z.array(variantInputSchema).max(200).optional(),
  tag_ids: z.array(z.string().uuid()).max(30).optional(),
}).refine((o) => Object.keys(o).length > 0, { message: '没有需要更新的字段' });

const adminProductPatchStatusBodySchema = z.object({
  lifecycle_status: z.number().int().min(0).max(2),
});

const adminProductBatchStatusBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  status: z.enum(['active', 'inactive', 'draft']),
});

const adminProductTagsBodySchema = z.object({
  tag_ids: z.array(z.string().uuid()).max(30),
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
  adminProductTagsBodySchema,
  adminProductIdParamsSchema,
  variantInputSchema,
  specGroupInputSchema,
  specValueInputSchema,
};
