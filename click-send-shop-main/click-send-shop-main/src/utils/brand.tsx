import type { ReactNode } from "react";

/**
 * 把站点名称渲染为「主体 + 强调字」结构
 *  - 中文场景：最后一个字使用品牌强调色（如 "真烟" + 金色"网"）
 *  - 英文/纯字母场景：保持单色 (整体用 foreground 色)
 *
 * 用法：
 *   <h1>{renderBrandTitle(siteInfo.siteName)}</h1>
 */
export function renderBrandTitle(name?: string): ReactNode {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;

  const isCJK = /[\u4e00-\u9fa5]/.test(trimmed);
  if (isCJK && trimmed.length >= 2) {
    const head = trimmed.slice(0, -1);
    const tail = trimmed.slice(-1);
    return (
      <>
        {head}
        <span className="text-gold">{tail}</span>
      </>
    );
  }
  return trimmed;
}
