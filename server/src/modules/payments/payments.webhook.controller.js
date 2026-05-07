const { generateId } = require('../../utils/helpers');
const payRepo = require('./payments.repository');
const db = require('../../config/db');
const { asyncRoute } = require('../../middleware/asyncRoute');
const { ValidationError } = require('../../errors');

/**
 * 一期：人工 / 测试用 Webhook（生产请配置 PAYMENT_MANUAL_WEBHOOK_SECRET）
 */
exports.handleProviderWebhook = asyncRoute(async (req, res) => {
  const { provider } = req.params;
  if (provider !== 'manual') {
    return res.status(404).json({ code: 404, message: '未知 provider' });
  }
  const expected = (process.env.PAYMENT_MANUAL_WEBHOOK_SECRET || '').trim();
  if (!expected) {
    return res.status(503).json({ code: 503, message: '未配置 PAYMENT_MANUAL_WEBHOOK_SECRET' });
  }
  const secret = String(req.body?.secret || req.headers['x-webhook-secret'] || '');
  if (secret !== expected) {
    throw new ValidationError('Webhook 密钥无效');
  }
  const orderId = req.body?.order_id;
  if (!orderId) throw new ValidationError('order_id 必填');

  await payRepo.insertPaymentEvent(db, {
    id: generateId(),
    payment_order_id: null,
    order_id: orderId,
    provider: 'manual',
    provider_event_id: `manual_${Date.now()}`,
    event_type: 'manual_webhook_received',
    verify_status: 'success',
    processing_result: 'logged',
    payload_json: { body: { ...req.body, secret: '[redacted]' } },
    error_message: '',
  });

  res.success({ received: true }, '事件已记录（需管理端确认收款后才会改订单状态）');
});
