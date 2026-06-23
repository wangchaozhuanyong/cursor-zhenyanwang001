/** 分类金刚区图标：优先后台 icon_url，其次后台 token；兜底交给前台渲染为稳定线性图标。 */
export function getCategoryNavIconValue(
  category: { icon_url?: string; icon?: string },
  fallback = "category",
): string {
  const url = (category.icon_url || "").trim();
  if (url) return url;
  const emoji = (category.icon || "").trim();
  if (emoji) return emoji;
  return fallback;
}
