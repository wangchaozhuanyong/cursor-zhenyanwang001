export function normalizeNotificationDisplay(title?: string | null, content?: string | null) {
  let nextTitle = String(title || "").trim();
  let nextContent = String(content || "").trim();

  if (/^order shipped$/i.test(nextTitle)) {
    nextTitle = "订单已发货";
  }

  const shipPatterns = [
    /^Order #?([A-Za-z0-9-]+) has shipped\.\s*Carrier:\s*([^,.]+)\s*,?\s*Tracking:\s*([^.]+)\.?$/i,
    /^Order #?([A-Za-z0-9-]+) has shipped\.\s*Carrier:\s*([^.]+)\.\s*Tracking:\s*([^.]+)\.?$/i,
  ];
  for (const pattern of shipPatterns) {
    const match = nextContent.match(pattern);
    if (!match) continue;
    const orderNo = match[1];
    const carrier = String(match[2] || "").trim() || "暂无";
    const tracking = String(match[3] || "").trim() || "暂无";
    nextContent = `订单 ${orderNo} 已发货。承运商：${carrier}，物流单号：${tracking}。`;
    break;
  }

  return { title: nextTitle, content: nextContent };
}
