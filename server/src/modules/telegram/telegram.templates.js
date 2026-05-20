const DEFAULT_MAX_MESSAGE_LENGTH = 3900;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateText(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function formatMoney(amount) {
  const n = Number(amount);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function maskPhoneLast5(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? digits.slice(-5).padStart(Math.min(5, digits.length), '*') : '-';
}

function buildItemBlock(item, index) {
  const skuCode = item.skuCode ? escapeHtml(truncateText(item.skuCode, 64)) : '-';
  return [
    `${index}. ${escapeHtml(truncateText(item.productName || '未命名商品', 60))}`,
    `规格：${escapeHtml(truncateText(item.skuName || '默认规格', 40))}`,
    `SKU：${skuCode}`,
    `数量：x${Number(item.quantity || 0)}`,
    `单价：RM ${formatMoney(item.unitPrice)}`,
    `小计：RM ${formatMoney(item.lineTotal)}`,
  ].join('\n');
}

function splitPaymentSuccessMessage(snapshot, options = {}) {
  const order = snapshot.order || {};
  const includeItems = options.includeItems !== false;
  const maxLength = Math.max(1000, Number(options.maxLength) || DEFAULT_MAX_MESSAGE_LENGTH);
  const adminOrderUrl = options.adminOrderUrl || '';
  const header = [
    '✅ 付款成功订单提醒',
    '',
    `订单号：${escapeHtml(order.orderNo || '-')}`,
    `客户：${escapeHtml(truncateText(order.customerName || '客户', 40))}`,
    `手机尾号：${escapeHtml(maskPhoneLast5(order.contactPhone))}`,
    `付款金额：RM ${formatMoney(order.totalAmount)}`,
    `支付方式：${escapeHtml(order.paymentMethod || '-')}`,
    `支付渠道：${escapeHtml(order.paymentChannel || '-')}`,
    `付款时间：${escapeHtml(formatDateTime(order.paidAt))}`,
    '',
    '收货地址：',
    escapeHtml(truncateText(order.shippingAddress || '未填写', 260)),
  ].join('\n');
  const footer = `后台查看：${escapeHtml(adminOrderUrl || '-')}`;

  if (!includeItems) {
    return [[header, '', footer].join('\n')];
  }

  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  const itemBlocks = items.length
    ? items.map((item, idx) => buildItemBlock(item, idx + 1))
    : ['请进入后台查看完整明细。'];

  const messages = [];
  let current = `${header}\n\n商品明细：`;
  for (const block of itemBlocks) {
    const next = `${current}\n\n${block}`;
    if (next.length + footer.length + 2 <= maxLength) {
      current = next;
      continue;
    }
    messages.push(current);
    current = `商品明细（续）：\n\n${block}`;
  }
  messages.push(current);

  const lastIdx = messages.length - 1;
  if (messages[lastIdx].length + footer.length + 2 <= maxLength) {
    messages[lastIdx] = `${messages[lastIdx]}\n\n${footer}`;
  } else {
    messages.push(footer);
  }

  return messages;
}

module.exports = {
  escapeHtml,
  truncateText,
  formatMoney,
  formatDateTime,
  maskPhoneLast5,
  splitPaymentSuccessMessage,
};
