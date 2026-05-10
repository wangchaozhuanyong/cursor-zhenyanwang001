const { z } = require('zod');

const idParam = z.string().trim().min(1);

const productIdParamSchema = z.object({ id: idParam });

const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  category_id: idParam.optional(),
  category: idParam.optional(),
  categoryId: idParam.optional(),
  tag_id: idParam.optional(),
  tag: idParam.optional(),
  tagId: idParam.optional(),
  is_hot: z.string().optional(),
  is_new: z.string().optional(),
  is_recommended: z.string().optional(),
  keyword: z.string().trim().max(64).optional(),
  sort: z
    .enum([
      'default',
      'newest',
      'sales',
      'price_asc',
      'price_desc',
      'price-asc',
      'price-desc',
      'recommended',
    ])
    .optional(),
});

const productReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const productReviewProductParamSchema = z.object({
  productId: idParam,
});

const reviewIdParamSchema = z.object({ id: idParam });

const createReviewBodySchema = z.object({
  product_id: idParam,
  order_id: idParam.optional(),
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().trim().min(1, '请填写评价内容').max(1000),
  images: z.array(z.string().trim().max(512)).max(10).optional(),
});

const categoryIdParamSchema = z.object({ id: idParam });

const contentSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(64),
});

module.exports = {
  productIdParamSchema,
  productListQuerySchema,
  productReviewsQuerySchema,
  productReviewProductParamSchema,
  reviewIdParamSchema,
  createReviewBodySchema,
  categoryIdParamSchema,
  contentSlugParamSchema,
};
