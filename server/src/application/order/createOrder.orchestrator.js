const authService = require('../../modules/auth/service/auth.service');
const catalogService = require('../../modules/product/service/catalog.service');
const orderService = require('../../modules/order/service/order.service');
const { BusinessError } = require('../../errors/BusinessError');

async function createOrderOrchestrator(params, context) {
  const userId = context && context.userId;
  if (!userId) throw new BusinessError(401, '请先登录');

  const items = Array.isArray(params && params.items) ? params.items : [];
  if (!items.length) throw new BusinessError(400, '订单商品不能为空');

  await assertUserExists(userId);
  const productMap = await loadProducts(items);
  assertStockSufficient(items, productMap);
  assertAmountPositive(items, productMap);

  return orderService.createOrder(userId, params);
}

async function assertUserExists(userId) {
  await authService.getProfile(userId);
}

async function loadProducts(items) {
  const map = {};
  for (const item of items) {
    const pid = item && item.product_id;
    if (!pid || !Number.isInteger(item.qty) || item.qty <= 0) {
      throw new BusinessError(400, '订单商品无效');
    }
    if (map[pid]) continue;
    const product = await catalogService.getProductById(pid);
    if (!product) throw new BusinessError(400, `商品不存在或已下架（${pid}）`);
    map[pid] = product;
  }
  return map;
}

function assertStockSufficient(items, productMap) {
  for (const item of items) {
    const p = productMap[item.product_id];
    if (p.stock < item.qty) {
      throw new BusinessError(400, `商品「${p.name}」库存不足，剩余 ${p.stock}`);
    }
  }
}

function assertAmountPositive(items, productMap) {
  let amount = 0;
  for (const item of items) {
    const p = productMap[item.product_id];
    amount += Number(p.price) * item.qty;
  }
  if (!(amount > 0)) throw new BusinessError(400, '订单金额无效');
}

module.exports = {
  createOrderOrchestrator,
};


