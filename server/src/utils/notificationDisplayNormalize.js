function normalizeLegacyOrderShipTitle(title) {
  const text = String(title || '').trim();
  if (/^order shipped$/i.test(text)) return '订单已发货';
  return text;
}

function normalizeLegacyOrderShipContent(content) {
  const text = String(content || '').trim();
  const patterns = [
    /^Order #?([A-Za-z0-9-]+) has shipped\.\s*Carrier:\s*([^,.]+)\s*,?\s*Tracking:\s*([^.]+)\.?$/i,
    /^Order #?([A-Za-z0-9-]+) has shipped\.\s*Carrier:\s*([^.]+)\.\s*Tracking:\s*([^.]+)\.?$/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const orderNo = match[1];
    const carrier = String(match[2] || '').trim() || '暂无';
    const tracking = String(match[3] || '').trim() || '暂无';
    return `订单 ${orderNo} 已发货。承运商：${carrier}，物流单号：${tracking}。`;
  }
  return text;
}

function normalizeLegacyNotificationDisplay(title, content) {
  return {
    title: normalizeLegacyOrderShipTitle(title),
    content: normalizeLegacyOrderShipContent(content),
  };
}

function isLegacyEnglishOrderShipCopy(kind, value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (kind === 'title') return /^order shipped$/i.test(text);
  return /has shipped/i.test(text) && /carrier/i.test(text);
}

module.exports = {
  normalizeLegacyNotificationDisplay,
  isLegacyEnglishOrderShipCopy,
};
