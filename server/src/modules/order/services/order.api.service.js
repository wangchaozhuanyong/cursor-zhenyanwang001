/**
 * 订单用户侧基础 API 门面
 *
 * 约束：
 *   - 不实现核心业务，仅做「对外 API 入口」薄封装
 *   - 创建订单涉及跨模块（auth / catalog / order）→ 必须经 orchestrator
 *   - 查询类仅访问本模块 domain service
 */
const orderService = require('../order.service');
const { createOrderOrchestrator } = require('../../../application/order/createOrder.orchestrator');

async function createOrder(userId, body) {
  return createOrderOrchestrator(body, { userId });
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
