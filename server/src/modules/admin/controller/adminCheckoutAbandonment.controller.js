const { asyncRoute } = require('../../../middleware/asyncRoute');
const checkoutAbandonmentService = require('../../order/checkoutAbandonment.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await checkoutAbandonmentService.listAdminCheckoutAbandonments(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});
