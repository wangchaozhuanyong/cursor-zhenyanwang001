const orderStateMachine = require('./orderStateMachine');
const returnStateMachine = require('./returnStateMachine');
const orderPublicFacade = require('./service/orderPublicFacade.service');
const orderService = require('./service/order.service');
const orderCancelService = require('./service/orderCancel.service');
const orderProfitService = require('./service/orderProfit.service');
const orderRefundCompensation = require('./service/orderRefundCompensation.service');
const checkoutAbandonmentService = require('./service/checkoutAbandonment.service');
const orderPoints = require('./service/orderPoints.service');
const orderTimeoutEvents = require('./service/orderEventTimeout.service');
const orderPaymentTimeout = require('./service/orderPaymentTimeout.service');
const returnService = require('./service/return.service');
const pricingService = require('./service/pricing.service');
const inventoryLockService = require('./service/inventoryLock.service');

module.exports = {
  assertFulfillmentTransition: orderStateMachine.assertFulfillmentTransition,
  assertPaymentTransition: orderStateMachine.assertPaymentTransition,
  paymentStatusAfterFulfillmentChange: orderStateMachine.paymentStatusAfterFulfillmentChange,
  canShip: orderStateMachine.canShip,
  canUserCancel: orderStateMachine.canUserCancel,
  assertReturnTransition: returnStateMachine.assertReturnTransition,
  insertReturnEvent: returnService.insertReturnEvent,
  insertReturnEventConn: returnService.insertReturnEventConn,
  markCheckoutAbandonmentPaidByOrderId: orderPublicFacade.markCheckoutAbandonmentPaidByOrderId,
  markCheckoutAbandonmentClosedByOrderId: orderPublicFacade.markCheckoutAbandonmentClosedByOrderId,
  getOrderPool: orderPublicFacade.getOrderPool,
  getOrderConnection: orderPublicFacade.getOrderConnection,
  selectOrderById: orderPublicFacade.selectOrderById,
  selectOrderByIdAndUser: orderPublicFacade.selectOrderByIdAndUser,
  selectOrderByIdAndUserForUpdate: orderPublicFacade.selectOrderByIdAndUserForUpdate,
  selectOrderByIdForUpdate: orderPublicFacade.selectOrderByIdForUpdate,
  selectOrderByIdOrOrderNoForUpdate: orderPublicFacade.selectOrderByIdOrOrderNoForUpdate,
  updateOrderPaid: orderPublicFacade.updateOrderPaid,
  updateOrderRefundState: orderPublicFacade.updateOrderRefundState,
  selectVariantsForUpdate: orderPublicFacade.selectVariantsForUpdate,
  selectDefaultVariantsForProducts: orderPublicFacade.selectDefaultVariantsForProducts,
  ensureVariantStockWithAutoUnpack: orderPublicFacade.ensureVariantStockWithAutoUnpack,
  insertOrder: orderPublicFacade.insertOrder,
  insertOrderItem: orderPublicFacade.insertOrderItem,
  updateOrderGiftRedeemPaid: orderPublicFacade.updateOrderGiftRedeemPaid,
  selectOrderItemQtyRows: orderPublicFacade.selectOrderItemQtyRows,
  incrementProductSales: orderPublicFacade.incrementProductSales,
  decrementProductSales: orderPublicFacade.decrementProductSales,
  applyOrderRefundCompensation: orderRefundCompensation.applyOrderRefundCompensation,
  insertOrderNotification: orderPublicFacade.insertOrderNotification,
  insertWebhookEventIfAbsent: orderPublicFacade.insertWebhookEventIfAbsent,
  cancelPendingOrderInTransaction: orderCancelService.cancelPendingOrderInTransaction,
  listAdminCheckoutAbandonments: checkoutAbandonmentService.listAdminCheckoutAbandonments,
  listDueCheckoutReminders: checkoutAbandonmentService.listDueCheckoutReminders,
  markCheckoutReminderSent: checkoutAbandonmentService.markCheckoutReminderSent,
  recomputeOrderProfitAmounts: orderProfitService.recomputeOrderProfitAmounts,
  getOrderSummary: orderService.getOrderSummary,
  maybeGrantOrderEarnPoints: orderPoints.maybeGrantOrderEarnPoints,
  maybeGrantOrderEarnOnPaymentSuccess: orderPoints.maybeGrantOrderEarnOnPaymentSuccess,
  rollbackOrderPoints: orderPoints.rollbackOrderPoints,
  applyOrderRedeem: orderPoints.applyOrderRedeem,
  applyGiftRedeem: orderPoints.applyGiftRedeem,
  reverseGiftRedeem: orderPoints.reverseGiftRedeem,
  reverseOrderRedeem: orderPoints.reverseOrderRedeem,
  grantOrderEarnPoints: orderPoints.grantOrderEarnPoints,
  reverseOrderEarnPoints: orderPoints.reverseOrderEarnPoints,
  refundOrderRedeemOnly: orderPoints.refundOrderRedeemOnly,
  reverseOrderEarnOnly: orderPoints.reverseOrderEarnOnly,
  rollbackOrderPointsForPartialRefund: orderPoints.rollbackOrderPointsForPartialRefund,
  autoResolveOrderTimeoutEvents: orderTimeoutEvents.autoResolveOrderTimeoutEvents,
  loadPaymentTimeoutSettings: orderPaymentTimeout.loadPaymentTimeoutSettings,
  buildCheckoutPricing: pricingService.buildCheckoutPricing,
  confirmOrderInventoryIfLocked: inventoryLockService.confirmOrderInventoryIfLocked,
  lockOrderInventory: inventoryLockService.lockOrderInventory,
  releaseOrderInventory: inventoryLockService.releaseOrderInventory,
  restoreOrderInventoryAfterRefund: inventoryLockService.restoreOrderInventoryAfterRefund,
};
