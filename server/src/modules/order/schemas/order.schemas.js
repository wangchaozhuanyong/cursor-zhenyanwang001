const { z } = require('zod');

const idParam = z.string().trim().min(1);

const orderIdParamSchema = z.object({ id: idParam });

const orderItemSchema = z.object({
  product_id: idParam,
  variant_id: idParam.optional(),
  sku_code: z.string().trim().max(64).optional(),
  qty: z.coerce.number().int().min(1).max(9999),
});

const malaysiaStates = [
  'Selangor', 'Kuala Lumpur', 'Johor', 'Penang', 'Perak', 'Sabah', 'Sarawak',
  'Melaka', 'Negeri Sembilan', 'Pahang', 'Kelantan', 'Terengganu', 'Kedah',
  'Perlis', 'Putrajaya', 'Labuan',
];

const addressObjectSchema = z.object({
  recipient_name: z.string().trim().min(1).max(64).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  line1: z.string().trim().min(1, '请填写地址第一行').max(255),
  line2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1, '请填写城市').max(80),
  state: z.enum(malaysiaStates),
  postcode: z.string().trim().regex(/^\d{5}$/, '马来西亚邮编必须为 5 位数字'),
  country: z.literal('MY').default('MY'),
});

const createOrderBodySchema = z.object({
  items: z.array(orderItemSchema).min(1, '订单商品不能为空'),
  contact_name: z.string().trim().min(1, '联系人姓名不能为空').max(64),
  contact_phone: z.string().trim().min(6, '联系人电话不正确').max(20),
  address: z.union([z.string().trim().max(512), addressObjectSchema]).optional(),
  note: z.string().trim().max(512).optional(),
  coupon_id: idParam.optional(),
  coupon_title: z.string().trim().max(64).optional(),
  shipping_template_id: idParam.optional(),
  shipping_name: z.string().trim().max(64).optional(),
  payment_method: z
    .enum(['online', 'reward_wallet', 'whatsapp', 'offline', 'manual', 'mock', 'cash', 'bank_transfer'])
    .optional(),
  estimated_weight_kg: z.coerce.number().nonnegative().optional(),
  checkout_abandonment_id: idParam.optional(),
  use_points: z.coerce.boolean().optional(),
  points_to_use: z.coerce.number().int().min(0).optional(),
  use_reward_cash: z.coerce.boolean().optional(),
  reward_cash_amount: z.coerce.number().min(0).optional(),
});

const checkoutAbandonmentItemSchema = z.object({
  product_id: idParam,
  variant_id: idParam.optional(),
  sku_code: z.string().trim().max(64).optional(),
  variant_name: z.string().trim().max(120).optional(),
  name: z.string().trim().max(120).optional(),
  image: z.string().trim().max(512).optional(),
  qty: z.coerce.number().int().min(1).max(9999),
  price: z.coerce.number().nonnegative().optional(),
});

const checkoutAbandonmentBodySchema = z.object({
  checkout_abandonment_id: idParam.optional(),
  items: z.array(checkoutAbandonmentItemSchema).min(1),
  raw_amount: z.coerce.number().nonnegative().optional(),
  discount_amount: z.coerce.number().nonnegative().optional(),
  shipping_fee: z.coerce.number().nonnegative().optional(),
  total_amount: z.coerce.number().nonnegative().optional(),
  payment_method: z.string().trim().max(32).optional(),
  contact_name: z.string().trim().max(64).optional(),
  contact_phone: z.string().trim().max(32).optional(),
});

const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  tab: z
    .enum([
      'all',
      'pending_payment',
      'paid',
      'shipped',
      'pending_review',
      'completed',
      'after_sale',
      'cancelled',
    ])
    .optional(),
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
  order_item_id: idParam,
  quantity: z.coerce.number().int().min(1).max(9999),
  reason: z.string().trim().min(1, '请填写售后原因').max(512),
  type: z.enum(['refund', 'return_refund', 'exchange', 'repair']).default('refund'),
  description: z.string().trim().max(1000).optional(),
  images: z.array(z.string().trim().max(512)).max(20).optional(),
  amount: z.coerce.number().nonnegative().optional(),
  contact_phone: z.string().trim().max(20).optional(),
  proof_images: z.array(z.string().trim().max(512)).max(20).optional(),
});

const listReturnsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const previewOrderBodySchema = createOrderBodySchema;

module.exports = {
  orderIdParamSchema,
  createOrderBodySchema,
  previewOrderBodySchema,
  checkoutAbandonmentBodySchema,
  listOrdersQuerySchema,
  payOrderBodySchema,
  createReturnBodySchema,
  listReturnsQuerySchema,
};

