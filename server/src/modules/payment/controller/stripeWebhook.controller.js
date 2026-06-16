const paymentService = require('../service/payment.service');
const stripeWebhookService = require('../service/stripeWebhook.service');

/**
 * Stripe Webhook：需要在 Stripe Dashboard 配置 endpoint，且本路由必须在 express.json 之前挂载 raw body。
 * 环境变量：STRIPE_SECRET_KEY、STRIPE_WEBHOOK_SECRET
 */
exports.handleWebhook = async (req, res) => {
  const parsed = stripeWebhookService.verifyAndParseStripeEvent(req);

  if (parsed.type === 'missing_config') {
    return res.status(503).json({ code: 503, message: parsed.message });
  }
  if (parsed.type === 'stripe_load_failed') {
    return res.status(500).json({ code: 500, message: parsed.message });
  }
  if (parsed.type === 'bad_signature') {
    return res.status(400).send(`Webhook signature verification failed: ${parsed.message}`);
  }

  try {
    await paymentService.handleStripeEvent(parsed.event);
  } catch (e) {
    console.error('[stripe webhook]', e);
    return res.status(500).json({ code: 500, message: '处理订单失败' });
  }

  res.json({ received: true });
};
