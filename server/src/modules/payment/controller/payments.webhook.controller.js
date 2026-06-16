const paymentsService = require('../service/payments.service');
const { asyncRoute } = require('../../../middleware/asyncRoute');

/**
 * 一期：人工 / 测试�?Webhook（生产请配置 PAYMENT_MANUAL_WEBHOOK_SECRET�? */
exports.handleProviderWebhook = asyncRoute(async (req, res) => {
  const provider = String(req.params.provider || '');
  if (['malaysia-local', 'malaysia_local', 'billplz', 'fpx'].includes(provider)) {
    const result = await paymentsService.handleMalaysiaLocalWebhook(
      provider,
      req.body,
      req.headers,
    );
    res.success(result.data, result.message);
    return;
  }
  const result = await paymentsService.handleManualWebhook(
    provider,
    req.body,
    req.headers['x-webhook-signature'] || req.headers['x-signature'],
  );
  res.success(result.data, result.message);
});


