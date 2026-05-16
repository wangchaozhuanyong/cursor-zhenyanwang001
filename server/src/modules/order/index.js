const { Router } = require('express');
const orderStateMachine = require('./orderStateMachine');
const returnStateMachine = require('./returnStateMachine');
const checkoutAbandonmentRepo = require('./checkoutAbandonment.repository');
const orderRepo = require('./order.repository');

const router = Router();

/** 须在挂载子路由之前注册，避免 order ↔ payment 循环依赖时 api 尚未就绪 */
/** @type {any} */ (router).api = {
  assertFulfillmentTransition: orderStateMachine.assertFulfillmentTransition,
  assertPaymentTransition: orderStateMachine.assertPaymentTransition,
  paymentStatusAfterFulfillmentChange: orderStateMachine.paymentStatusAfterFulfillmentChange,
  canShip: orderStateMachine.canShip,
  canUserCancel: orderStateMachine.canUserCancel,
  assertReturnTransition: returnStateMachine.assertReturnTransition,
  markCheckoutAbandonmentPaidByOrderId: checkoutAbandonmentRepo.markPaidByOrderId,
  markCheckoutAbandonmentClosedByOrderId: checkoutAbandonmentRepo.markClosedByOrderId,
  getOrderPool: orderRepo.getPool,
  getOrderConnection: orderRepo.getConnection,
  selectOrderById: orderRepo.selectOrderById,
  selectOrderByIdAndUser: orderRepo.selectOrderByIdAndUser,
  selectOrderByIdAndUserForUpdate: orderRepo.selectOrderByIdAndUserForUpdate,
  selectOrderByIdForUpdate: orderRepo.selectOrderByIdForUpdate,
  updateOrderPaid: orderRepo.updateOrderPaid,
  updateOrderRefundState: orderRepo.updateOrderRefundState,
  selectOrderItemQtyRows: orderRepo.selectOrderItemQtyRows,
  incrementProductSales: orderRepo.incrementProductSales,
  insertOrderNotification: orderRepo.insertNotification,
  insertWebhookEventIfAbsent: orderRepo.insertWebhookEventIfAbsent,
};

router.use('/orders', require('./orders.routes'));
router.use('/returns', require('./returns.routes'));

module.exports = router;
