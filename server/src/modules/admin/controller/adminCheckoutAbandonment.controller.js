const { asyncRoute } = require('../../../middleware/asyncRoute');

function getOrderApi() {
  return /** @type {any} */ (require('../../order')).api || {};
}

exports.list = asyncRoute(async (req, res) => {
  const r = await getOrderApi().listAdminCheckoutAbandonments(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.listDueReminders = asyncRoute(async (req, res) => {
  const list = await getOrderApi().listDueCheckoutReminders(Number(req.query.limit) || 100);
  res.success(list);
});

exports.markReminderSent = asyncRoute(async (req, res) => {
  const r = await getOrderApi().markCheckoutReminderSent(req.params.id, req.body?.channel);
  res.success(r.data);
});


