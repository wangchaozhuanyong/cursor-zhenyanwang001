const paymentsService = require('./payments.service');
const { asyncRoute } = require('../../../middleware/asyncRoute');

/**
 * 一期：人工 / 测试用 Webhook（生产请配置 PAYMENT_MANUAL_WEBHOOK_SECRET）
 */
exports.handleProviderWebhook = asyncRoute(async (req, res) => {
  const result = await paymentsService.handleManualWebhook(
    req.params.provider,
    req.body,
    req.headers['x-webhook-secret'],
  );
  res.success(result.data, result.message);
});
