const { asyncRoute } = require('../../../middleware/asyncRoute');
const feedbackService = require('../service/feedback.service');
const { getClientIp } = require('../../../utils/clientIp');

exports.submit = asyncRoute(async (req, res) => {
  const result = await feedbackService.submitFeedback(req.user?.id || null, req.body, {
    ip: getClientIp(req),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
  });
  res.success(result.data, result.message);
});

exports.listMine = asyncRoute(async (req, res) => {
  const result = await feedbackService.listMyFeedback(req.user.id, req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});
