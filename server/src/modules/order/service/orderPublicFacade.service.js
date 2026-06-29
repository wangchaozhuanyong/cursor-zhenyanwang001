const checkoutAbandonmentRepo = require('../repository/checkoutAbandonment.repository');
const orderRepo = require('../repository/order.repository');

module.exports = {
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
  selectVariantsForUpdate: orderRepo.selectVariantsForUpdate,
  selectDefaultVariantsForProducts: orderRepo.selectDefaultVariantsForProducts,
  ensureVariantStockWithAutoUnpack: orderRepo.ensureVariantStockWithAutoUnpack,
  insertOrder: orderRepo.insertOrder,
  insertOrderItem: orderRepo.insertOrderItem,
  updateOrderGiftRedeemPaid: orderRepo.updateOrderGiftRedeemPaid,
  selectOrderItemQtyRows: orderRepo.selectOrderItemQtyRows,
  incrementProductSales: orderRepo.incrementProductSales,
  decrementProductSales: orderRepo.decrementProductSales,
  insertOrderNotification: orderRepo.insertNotification,
  insertWebhookEventIfAbsent: orderRepo.insertWebhookEventIfAbsent,
};
