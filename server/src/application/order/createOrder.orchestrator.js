/**
 * 应用编排层：创建订单
 *
 * 职责：协调 auth / catalog / order 三个领域服务，组织跨模块业务流程。
 * 约束：
 *   - 不写 SQL、不直接访问数据库
 *   - 不接触 req / res
 *   - 所有错误统一抛 BusinessError
 *   - 不在此层实现任何领域规则（领域规则仍归各自 domain service）
 */
const authService = require('../../modules/auth/auth.service');
const catalogService = require('../../modules/catalog/catalog.service');
const orderService = require('../../modules/order/order.service');
const { BusinessError } = require('../../errors/BusinessError');

/**
 * @param {object} params  请求体参数（透传给 order 领域服务）
 * @param {{ userId: string }} context  调用上下文
 * @returns {Promise<object>} 订单创建结果
 */
async function createOrderOrchestrator(params, context) {
  const userId = context && context.userId;
  if (!userId) throw new BusinessError(401, '用户未认证');

  const items = Array.isArray(params && params.items) ? params.items : [];
  if (!items.length) throw new BusinessError(400, '订单商品不能为空');

  await assertUserExists(userId);
  const productMap = await loadProducts(items);
  assertStockSufficient(items, productMap);
  assertAmountPositive(items, productMap);

  const order = await orderService.createOrder(userId, params);
  return order;
}

async function assertUserExists(userId) {
  // getProfile 内部对不存在会抛 BusinessError(404, '用户不存在')
  await authService.getProfile(userId);
}

async function loadProducts(items) {
  const map = {};
  for (const item of items) {
    const pid = item && item.product_id;
    if (!pid || !Number.isInteger(item.qty) || item.qty <= 0) {
      throw new BusinessError(400, '商品数量无效');
    }
    if (map[pid]) continue;
    const product = await catalogService.getProductById(pid);
    if (!product) throw new BusinessError(400, `商品 ${pid} 不存在或已下架`);
    map[pid] = product;
  }
  return map;
}

function assertStockSufficient(items, productMap) {
  for (const item of items) {
    const p = productMap[item.product_id];
    if (p.stock < item.qty) {
      throw new BusinessError(400, `商品「${p.name}」库存不足，剩余 ${p.stock} 件`);
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
