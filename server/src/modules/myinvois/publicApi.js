const myinvoisService = require('./service/myinvois.service');

module.exports = {
  enqueueOrderInvoiceIfEnabled: myinvoisService.enqueueOrderInvoiceIfEnabled,
  enqueueRefundCreditNoteIfEnabled: myinvoisService.enqueueRefundCreditNoteIfEnabled,
  processPendingBatch: myinvoisService.processPendingBatch,
  startMyInvoisRetryScheduler: myinvoisService.startMyInvoisRetryScheduler,
};
