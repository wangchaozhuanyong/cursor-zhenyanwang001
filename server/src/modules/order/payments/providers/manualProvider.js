/**
 * 线下 / 人工确认类渠道：仅创建待支付单，由管理端「确认收款」完成闭环。
 */
async function createIntent({ paymentOrderId }) {
  return {
    redirectUrl: undefined,
    clientSecret: undefined,
    raw: { paymentOrderId, mode: 'manual_pending' },
  };
}

module.exports = { createIntent };
