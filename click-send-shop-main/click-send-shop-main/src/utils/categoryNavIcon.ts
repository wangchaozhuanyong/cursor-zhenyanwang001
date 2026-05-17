/** 分类金刚区图标：优先后台 icon_url（透明 PNG），其次 emoji icon */
export function getCategoryNavIconValue(
  category: { icon_url?: string; icon?: string },
  fallback = "📂",
): string {
  const url = (category.icon_url || "").trim();
  if (url) return url;
  const emoji = (category.icon || "").trim();
  if (emoji) return emoji;
  return fallback;
}
