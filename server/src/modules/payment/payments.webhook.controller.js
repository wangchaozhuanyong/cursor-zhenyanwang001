const paymentsService = require('./payments.service');
const { asyncRoute } = require('../../middleware/asyncRoute');

/**
 * 涓€鏈燂細浜哄伐 / 娴嬭瘯鐢?Webhook锛堢敓浜ц閰嶇疆 PAYMENT_MANUAL_WEBHOOK_SECRET锛? */
exports.handleProviderWebhook = asyncRoute(async (req, res) => {
  const provider = String(req.params.provider || '');
  if (['malaysia-local', 'malaysia_local'].includes(provider)) {
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
    req.headers['x-webhook-secret'],
  );
  res.success(result.data, result.message);
});

