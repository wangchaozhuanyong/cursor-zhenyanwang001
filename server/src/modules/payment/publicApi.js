module.exports = {
  payWithRewardWallet: (...args) => require('./service/payments.service').payWithRewardWallet(...args),
  createStripeCheckoutForOrder: (...args) =>
    require('./service/payments.service').createStripeCheckoutForOrder(...args),
  recordRefundByAdmin: (...args) => require('./service/payments.service').recordRefundByAdmin(...args),
  listChannelsAdmin: () => require('./service/payments.service').listChannelsAdmin(),
  updateChannelAdmin: (...args) => require('./service/payments.service').updateChannelAdmin(...args),
  listPaymentOrdersAdmin: (...args) => require('./service/payments.service').listPaymentOrdersAdmin(...args),
  listPaymentEventsAdmin: (...args) => require('./service/payments.service').listPaymentEventsAdmin(...args),
  listRefundEventsForReturn: (...args) => require('./service/payments.service').listRefundEventsForReturn(...args),
  markOrderPaidByAdmin: (...args) => require('./service/payments.service').markOrderPaidByAdmin(...args),
  replayEvent: (...args) => require('./service/payments.service').replayEvent(...args),
  listReconciliations: (...args) => require('./service/payments.service').listReconciliations(...args),
  createReconciliation: (...args) => require('./service/payments.service').createReconciliation(...args),
  reviewPaymentEvent: (...args) => require('./service/payments.service').reviewPaymentEvent(...args),
  reviewReconciliation: (...args) => require('./service/payments.service').reviewReconciliation(...args),
};
