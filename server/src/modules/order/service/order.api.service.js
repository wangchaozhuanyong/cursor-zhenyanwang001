const orderService = require('../service/order.service');
const authModule = require('../../auth');
const productModule = require('../../product');
const { BusinessError } = require('../../../errors/BusinessError');

function getAuthApi() {
  return /** @type {any} */ (authModule).api || {};
}

function getProductApi() {
  return /** @type {any} */ (productModule).api || {};
}

function requireApiMethod(api, name) {
  if (!api || typeof api[name] !== 'function') {
    throw new Error(`模块 API 未暴露方法: ${name}`);
  }
  return api[name];
}

async function assertUserExists(userId) {
  await requireApiMethod(getAuthApi(), 'getProfile')(userId);
}

async function loadProducts(items) {
  const map = {};
  const getProductById = requireApiMethod(getProductApi(), 'getProductById');

  for (const item of items) {
    const pid = item && item.product_id;
    if (!pid || !Number.isInteger(item.qty) || item.qty <= 0) {
      throw new BusinessError(400, '订单商品无效');
    }
    if (map[pid]) continue;
    const product = await getProductById(pid);
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

async function createOrder(userId, body) {
  const items = Array.isArray(body && body.items) ? body.items : [];
  if (!items.length) throw new BusinessError(400, '订单商品不能为空');

  await assertUserExists(userId);
  const productMap = await loadProducts(items);
  assertStockSufficient(items, productMap);
  assertAmountPositive(items, productMap);

  return orderService.createOrder(userId, body);
}

async function listOrders(userId, query) {
  const result = await orderService.getOrders(userId, query);
  return {
    list: result.list,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}

module.exports = {
  createOrder,
  listOrders,
};
