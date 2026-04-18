import { useEffect } from "react";

const DEFAULT_SUFFIX = "真烟网";

/**
 * 更新浏览器标题（SPA 内轻量 SEO / 体验）
 */
export function useDocumentTitle(title: string | undefined, suffix = DEFAULT_SUFFIX) {
  useEffect(() => {
    const prev = document.title;
    const t = (title || "").trim();
    document.title = t ? `${t} · ${suffix}` : suffix;
    return () => {
      document.title = prev;
    };
  }, [title, suffix]);
}
