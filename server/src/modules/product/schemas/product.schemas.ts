/**
 * Product 模块入参 Schemas
 *
 * 覆盖范围：
 *  - 商品列表/详情 query/params
 *  - 评论：列表 query / 创建 body / 切换点赞 params
 *  - 分类详情 params
 *  - 站点内容 :slug 与 site-info
 */
import { z } from 'zod';

const idParam = z.string().trim().min(1);

export const productIdParamSchema = z.object({ id: idParam });

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  category: idParam.optional(),
  categoryId: idParam.optional(),
  keyword: z.string().trim().max(64).optional(),
  sort: z
    .enum([
      'newest',
      'sales',
      'price_asc',
      'price_desc',
      'recommended',
    ])
    .optional(),
});

/* ── reviews ── */

export const productReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const productReviewProductParamSchema = z.object({
  productId: idParam,
});

export const reviewIdParamSchema = z.object({ id: idParam });

export const createReviewBodySchema = z.object({
  product_id: idParam,
  order_id: idParam.optional(),
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().trim().min(1, '请填写评价内容').max(1000),
  images: z.array(z.string().trim().max(512)).max(10).optional(),
});

/* ── category ── */

export const categoryIdParamSchema = z.object({ id: idParam });

/* ── content ── */

export const contentSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(64),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;
