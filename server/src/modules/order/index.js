const { Router } = require('express');
const orderStateMachine = require('./orderStateMachine');
const returnStateMachine = require('./returnStateMachine');
const checkoutAbandonmentRepo = require('./repository/checkoutAbandonment.repository');
const orderRepo = require('./repository/order.repository');
const orderService = require('./service/order.service');

const router = Router();

/** 须在挂载子路由之前注册，避免 order ? payment 循环依赖时 api 尚未就绪 */
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
  selectOrderByIdOrOrderNoForUpdate: orderRepo.selectOrderByIdOrOrderNoForUpdate,
  updateOrderPaid: orderRepo.updateOrderPaid,
  updateOrderRefundState: orderRepo.updateOrderRefundState,
  selectOrderItemQtyRows: orderRepo.selectOrderItemQtyRows,
  restoreVariantStock: orderRepo.restoreVariantStock,
  incrementProductSales: orderRepo.incrementProductSales,
  insertOrderNotification: orderRepo.insertNotification,
  insertWebhookEventIfAbsent: orderRepo.insertWebhookEventIfAbsent,
  cancelPendingOrderInTransaction: orderService.cancelPendingOrderInTransaction,
};

router.use('/orders', require('./routes/orders.routes'));
router.use('/returns', require('./routes/returns.routes'));

module.exports = router;

