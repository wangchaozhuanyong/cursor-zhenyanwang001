/**
 * User 域入参 Schemas（Zod）
 *
 * 覆盖：地址、收藏、积分、积分签到、邀请码绑定、消息、优惠券领取、奖励提现、运费询价。
 *
 * 注意：profile / password 相关 schema 在 `../auth/schemas/auth.schemas.ts`
 *      （会员资料路由复用 auth controller，schema 跟随业务定义）
 */
import { z } from 'zod';

const idParam = z.string().trim().min(1);

/* ── pagination ── */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

/* ── addresses ── */

export const addressIdParamSchema = z.object({ id: idParam });

const addressBaseSchema = z.object({
  receiver: z.string().trim().min(1, '请填写收件人').max(64),
  phone: z.string().trim().min(6, '收件人电话不正确').max(20),
  region: z.string().trim().max(128).optional(),
  detail: z.string().trim().min(1, '请填写详细地址').max(512),
  is_default: z.coerce.boolean().optional(),
});

export const createAddressBodySchema = addressBaseSchema;
export const updateAddressBodySchema = addressBaseSchema.partial();

/* ── favorites & history ── */

export const productIdParamSchema = z.object({ productId: idParam });

/**
 * 兼容历史字段：favorites.service 使用 product_id
 * - 前端/旧客户端可能传 product_id
 * - 新代码可传 productId
 * 最终输出统一为 { product_id }
 */
export const addFavoriteBodySchema = z
  .union([
    z.object({ product_id: idParam }),
    z.object({ productId: idParam }),
  ])
  .transform((v) => ({
    product_id: 'product_id' in v ? v.product_id : v.productId,
  }));

/**
 * 兼容历史字段：history.service 使用 product_id（若未来迁移可改 service 再收敛 schema）
 */
export const addHistoryBodySchema = z
  .union([
    z.object({ product_id: idParam }),
    z.object({ productId: idParam }),
  ])
  .transform((v) => ({
    product_id: 'product_id' in v ? v.product_id : v.productId,
  }));

/* ── points ── */
/** 仅 GET 列表，与通用分页一致 */
export const pointsListQuerySchema = paginationQuerySchema;

/* ── notifications ── */

export const notificationIdParamSchema = z.object({ id: idParam });

export const notificationListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['order', 'system', 'marketing', 'invite']).optional(),
});

/* ── coupons ── */

/**
 * 兼容历史字段：coupon.service 使用 code（既支持优惠券 code，也支持 id）
 * - 旧前端传 { code }
 * - 新前端也可以传 { couponId }（会映射为 code）
 */
export const claimCouponBodySchema = z
  .union([
    z.object({ code: z.string().trim().min(1) }),
    z.object({ couponId: idParam }),
  ])
  .transform((v) => ({
    code: 'code' in v ? v.code : v.couponId,
  }));

/* ── invite ── */

export const inviteBindBodySchema = z.object({
  inviteCode: z.string().trim().min(1, '请填写邀请码').max(32),
});

/* ── reward withdraw ── */

/**
 * reward.service 当前只读取 amount；这里兼容 method/channel/account 等不同客户端字段。
 */
export const withdrawBodySchema = z
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

/* ── shipping ── */

export const shippingQuoteBodySchema = z.object({
  shipping_template_id: idParam,
  raw_amount: z.coerce.number().nonnegative('raw_amount 无效'),
  estimated_weight_kg: z.coerce.number().nonnegative().optional(),
});
