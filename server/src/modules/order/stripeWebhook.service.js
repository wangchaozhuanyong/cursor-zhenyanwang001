/**
 * Stripe Webhook：验签与事件解析（HTTP 细节由 controller 映射状态码）。
 */

/**
 * @param {import('express').Request} req
 * @returns
 *   | { type: 'ok'; event: import('stripe').Stripe.Event }
 *   | { type: 'missing_config'; message: string }
 *   | { type: 'stripe_load_failed'; message: string }
 *   | { type: 'bad_signature'; message: string }
 */
function verifyAndParseStripeEvent(req) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !secretKey) {
    return {
      type: 'missing_config',
      message: 'Stripe 未配置：请设置 STRIPE_SECRET_KEY 与 STRIPE_WEBHOOK_SECRET',
    };
  }

  let stripe;
  try {
    const createStripe = /** @type {(k: string) => import('stripe').Stripe} */ (
      /** @type {unknown} */ (require('stripe'))
    );
    stripe = createStripe(secretKey);
  } catch {
    return { type: 'stripe_load_failed', message: '请安装依赖: npm install stripe' };
  }

  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    return { type: 'ok', event };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { type: 'bad_signature', message };
  }
}

module.exports = {
  verifyAndParseStripeEvent,
};
