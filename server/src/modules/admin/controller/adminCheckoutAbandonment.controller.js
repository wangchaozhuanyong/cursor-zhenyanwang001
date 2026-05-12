const { asyncRoute } = require('../../../middleware/asyncRoute');
const checkoutAbandonmentService = require('../../order/checkoutAbandonment.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await checkoutAbandonmentService.listAdminCheckoutAbandonments(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.listDueReminders = asyncRoute(async (req, res) => {
  const list = await checkoutAbandonmentService.listDueCheckoutReminders(Number(req.query.limit) || 100);
  res.success(list);
});

exports.markReminderSent = asyncRoute(async (req, res) => {
  const r = await checkoutAbandonmentService.markCheckoutReminderSent(req.params.id, req.body?.channel);
  res.success(r.data);
});
