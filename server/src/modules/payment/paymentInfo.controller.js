exports.config = (req, res) => {
  const hasStripe = !!process.env.STRIPE_SECRET_KEY;
  const hasWebhook = !!process.env.STRIPE_WEBHOOK_SECRET;
  const publicAppUrl = (process.env.PUBLIC_APP_URL || '').trim();
  res.success({
    mockPayment: false,
    stripeReady: hasStripe && hasWebhook,
    stripeCheckoutReady: hasStripe && !!publicAppUrl,
    publicAppUrlConfigured: !!publicAppUrl,
    stripeWebhookUrl: '/api/payment/stripe/webhook',
    docs:
      'Checkout 会话会将 payment_intent.metadata.order_id 设为订单 id；支付成功后 Webhook 会置为已付款',
  });
};
