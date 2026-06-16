const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const giftRepo = require('../repository/pointsGift.repository');
const productPublicApi = /** @type {any} */ (require('../../product/publicApi'));

function getProductApi() {
  return productPublicApi || {};
}

function requireProductApi(name) {
  const fn = getProductApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Product module API missing method: ${name}`);
  }
  return fn;
}

function normalizeGiftPayload(body = {}) {
  const productId = String(body.product_id || body.productId || '').trim();
  if (!productId) throw new BusinessError(400, '请选择关联商品');
  const requiredPoints = Math.trunc(Number(body.required_points ?? body.requiredPoints ?? 0));
  if (!Number.isFinite(requiredPoints) || requiredPoints <= 0) {
    throw new BusinessError(400, '所需积分必须大于 0');
  }
  return {
    product_id: productId,
    variant_id: body.variant_id || body.variantId || null,
    title: String(body.title || '').trim(),
    image: String(body.image || '').trim(),
    required_points: requiredPoints,
    cash_amount: Math.max(0, Number(body.cash_amount ?? body.cashAmount ?? 0)),
    stock_limit: Math.max(0, Math.trunc(Number(body.stock_limit ?? body.stockLimit ?? 0))),
    limit_per_user: Math.max(0, Math.trunc(Number(body.limit_per_user ?? body.limitPerUser ?? 0))),
    start_at: body.start_at || body.startAt || null,
    end_at: body.end_at || body.endAt || null,
    enabled: body.enabled === undefined ? 1 : (body.enabled ? 1 : 0),
    sort_order: Math.trunc(Number(body.sort_order ?? body.sortOrder ?? 0)),
  };
}

async function getProductById(productId) {
  try {
    return await requireProductApi('getProductById')(productId);
  } catch (err) {
    if (err?.status === 404 || err?.code === 404) return null;
    throw err;
  }
}

async function listGiftItems(query = {}) {
  const page = await giftRepo.selectGiftItemsPage(null, query);
  const list = [];
  for (const row of page.list) {
    const product = await getProductById(row.product_id);
    list.push({
      ...row,
      enabled: !!row.enabled,
      product_name: product?.name || '',
    });
  }
  return { ...page, list };
}

async function createGiftItem(body) {
  const payload = normalizeGiftPayload(body);
  const product = await getProductById(payload.product_id);
  if (!product) throw new BusinessError(400, '关联商品不存在');
  const id = generateId();
  await giftRepo.insertGiftItem(null, { id, ...payload });
  return { data: { id, ...payload }, message: '礼品已创建' };
}

async function updateGiftItem(id, body) {
  const existing = await giftRepo.selectGiftItemById(null, id);
  if (!existing) throw new BusinessError(404, '礼品不存在');
  const fields = [];
  const values = [];
  const map = {
    product_id: 'product_id',
    variant_id: 'variant_id',
    title: 'title',
    image: 'image',
    required_points: 'required_points',
    cash_amount: 'cash_amount',
    stock_limit: 'stock_limit',
    limit_per_user: 'limit_per_user',
    start_at: 'start_at',
    end_at: 'end_at',
    sort_order: 'sort_order',
  };
  for (const [key, col] of Object.entries(map)) {
    const alt = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (body[key] !== undefined || body[alt] !== undefined) {
      const val = body[key] !== undefined ? body[key] : body[alt];
      fields.push(`${col} = ?`);
      values.push(val);
    }
  }
  if (body.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(body.enabled ? 1 : 0);
  }
  if (!fields.length) throw new BusinessError(400, '没有需要更新的字段');
  await giftRepo.updateGiftItem(null, id, fields, values);
  return { data: null, message: '礼品已更新' };
}

async function deleteGiftItem(id) {
  const existing = await giftRepo.selectGiftItemById(null, id);
  if (!existing) throw new BusinessError(404, '礼品不存在');
  await giftRepo.deleteGiftItem(null, id);
  return { data: null, message: '礼品已删除' };
}

async function listRedemptions(query = {}) {
  return giftRepo.selectGiftRedemptionsPage(null, query);
}

module.exports = {
  listGiftItems,
  createGiftItem,
  updateGiftItem,
  deleteGiftItem,
  listRedemptions,
};
