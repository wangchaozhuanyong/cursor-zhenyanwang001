const { Router } = require('express');
const orderStateMachine = require('./orderStateMachine');
const returnStateMachine = require('./returnStateMachine');
const checkoutAbandonmentRepo = require('./repository/checkoutAbandonment.repository');
const orderRepo = require('./repository/order.repository');
const orderService = require('./service/order.service');
const orderRefundCompensation = require('./service/orderRefundCompensation.service');
const checkoutAbandonmentService = require('./service/checkoutAbandonment.service');

const router = Router();

/** ùùù?ùùùùùùùù???ù?ùùùù order ? payment ?ùùùùùù? api ùù?ùùùù */
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
  decrementActivitySold: orderRepo.decrementActivitySold,
  restoreVariantStock: orderRepo.restoreVariantStock,
  incrementProductSales: orderRepo.incrementProductSales,
  decrementProductSales: orderRepo.decrementProductSales,
  applyOrderRefundCompensation: orderRefundCompensation.applyOrderRefundCompensation,
  insertOrderNotification: orderRepo.insertNotification,
  insertWebhookEventIfAbsent: orderRepo.insertWebhookEventIfAbsent,
  cancelPendingOrderInTransaction: orderService.cancelPendingOrderInTransaction,
  listAdminCheckoutAbandonments: checkoutAbandonmentService.listAdminCheckoutAbandonments,
  listDueCheckoutReminders: checkoutAbandonmentService.listDueCheckoutReminders,
  markCheckoutReminderSent: checkoutAbandonmentService.markCheckoutReminderSent,
};

router.use('/orders', require('./routes/orders.routes'));
router.use('/returns', require('./routes/returns.routes'));

module.exports = router;

