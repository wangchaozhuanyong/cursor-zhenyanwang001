/** 仿电商 App 的商品分享文案（标题 + 价格 + 链接） */
export function buildProductShareText(
  name: string,
  price: number,
  url: string,
  shopName?: string,
): string {
  const shop = (shopName || "").trim() || "本店";
  const priceStr = Number.isFinite(price) ? `RM ${price.toFixed(2)}` : "";
  return [
    `【${name}】`,
    priceStr ? `价格：${priceStr}` : "",
    `我在${shop}发现一个好物，点击链接查看：`,
    url,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildProductSharePayload(
  name: string,
  price: number,
  url: string,
  shopName?: string,
) {
  const text = buildProductShareText(name, price, url, shopName);
  return { title: name, text, url };
}
