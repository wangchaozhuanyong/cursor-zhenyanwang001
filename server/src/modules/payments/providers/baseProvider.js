/**
 * 支付网关 Provider 抽象（二期接 Stripe/FPX/钱包时实现具体类）
 * @typedef {{
 *   createIntent: (ctx: {
 *     paymentOrderId: string;
 *     order: object;
 *     channel: object;
 *     returnUrl?: string;
 *   }) => Promise<{ redirectUrl?: string; clientSecret?: string; raw?: object }>;
 * }} PaymentProvider
 */

module.exports = {};
