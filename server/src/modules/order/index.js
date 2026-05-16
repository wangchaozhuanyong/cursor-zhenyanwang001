const { Router } = require('express');
const orderStateMachine = require('./orderStateMachine');
const returnStateMachine = require('./returnStateMachine');
const checkoutAbandonmentRepo = require('./checkoutAbandonment.repository');

const router = Router();

router.use('/orders', require('./orders.routes'));
router.use('/returns', require('./returns.routes'));

/** @type {any} */ (router).api = {
  assertFulfillmentTransition: orderStateMachine.assertFulfillmentTransition,
  assertPaymentTransition: orderStateMachine.assertPaymentTransition,
  paymentStatusAfterFulfillmentChange: orderStateMachine.paymentStatusAfterFulfillmentChange,
  canShip: orderStateMachine.canShip,
  canUserCancel: orderStateMachine.canUserCancel,
  assertReturnTransition: returnStateMachine.assertReturnTransition,
  markCheckoutAbandonmentPaidByOrderId: checkoutAbandonmentRepo.markPaidByOrderId,
  markCheckoutAbandonmentClosedByOrderId: checkoutAbandonmentRepo.markClosedByOrderId,
};

module.exports = router;
