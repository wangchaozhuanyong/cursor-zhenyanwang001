const { Router } = require('express');
const myinvoisService = require('./service/myinvois.service');

const router = Router();
router.use(require('./routes/myinvois.routes'));

/** @type {any} */ (router).api = {
  enqueueOrderInvoiceIfEnabled: myinvoisService.enqueueOrderInvoiceIfEnabled,
  enqueueRefundCreditNoteIfEnabled: myinvoisService.enqueueRefundCreditNoteIfEnabled,
  processPendingBatch: myinvoisService.processPendingBatch,
  startMyInvoisRetryScheduler: myinvoisService.startMyInvoisRetryScheduler,
};

module.exports = router;
