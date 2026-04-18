const paymentService = require('./payment.service');

/**
 * Stripe Webhook：需在 Stripe Dashboard 配置 endpoint，且本路由必须在 express.json 之前挂载 raw body。
 * 环境变量：STRIPE_SECRET_KEY、STRIPE_WEBHOOK_SECRET
 */
exports.handleWebhook = async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !secretKey) {
    return res.status(503).json({
      code: 503,
      message: 'Stripe 未配置：请设置 STRIPE_SECRET_KEY 与 STRIPE_WEBHOOK_SECRET',
    });
  }

  let stripe;
  try {
    stripe = require('stripe')(secretKey);
  } catch {
    return res.status(500).json({ code: 500, message: '请安装依赖: npm install stripe' });
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  try {
    await paymentService.handleStripeEvent(event);
  } catch (e) {
    console.error('[stripe webhook]', e);
    return res.status(500).json({ code: 500, message: '处理订单失败' });
  }

  res.json({ received: true });
};
