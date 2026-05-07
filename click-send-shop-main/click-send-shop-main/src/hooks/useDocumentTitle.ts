import { useEffect } from "react";
import { useSiteInfo } from "@/hooks/useSiteInfo";

const STATIC_FALLBACK = "大马通";

/**
 * 更新浏览器标题（SPA 内轻量 SEO / 体验）
 *
 *  - 标题优先级："{title} · {siteName}"（内页）→ siteInfo.seoTitle（首页/无 title 时）→ siteName
 *  - 显式传入 suffix 时，强制使用该后缀
 *  - 站点信息加载完成后自动重新设置（避免初次渲染只展示 fallback）
 */
export function useDocumentTitle(title: string | undefined, suffix?: string) {
  const siteInfo = useSiteInfo();
  const effectiveSuffix =
    suffix ?? siteInfo.siteName ?? STATIC_FALLBACK;
  const seoTitle = siteInfo.seoTitle?.trim();

  useEffect(() => {
    const prev = document.title;
    const t = (title || "").trim();

    if (!t && seoTitle) {
      document.title = seoTitle;
    } else if (t) {
      document.title = `${t} · ${effectiveSuffix}`;
    } else {
      document.title = effectiveSuffix;
    }

    return () => {
      document.title = prev;
    };
  }, [title, effectiveSuffix, seoTitle]);
}
