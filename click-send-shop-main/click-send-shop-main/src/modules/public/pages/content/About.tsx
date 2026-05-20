import { useEffect, useState } from "react";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import PageHeader from "@/components/PageHeader";
import * as contentService from "@/services/contentService";
import type { ContentPage } from "@/types/content";
import { stripHtml, truncateText } from "@/utils/seo";

function sanitizeCmsHtml(html: string): string {
  return String(html || "")
    .replace(/<\s*(script|iframe|object|embed|form|input|button|meta|link|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|form|input|button|meta|link|style)[^>]*\/?\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*(javascript:|data:text\/html)/gi, " $1=$2#");
}

export default function About() {
  const goBack = useGoBack();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || "官方商城";
  const [page, setPage] = useState<ContentPage | null>(null);

  useEffect(() => {
    contentService.fetchContentBySlug("about").then((p) => setPage(p ?? null)).catch(() => setPage(null));
  }, []);

  const pageSeoTitle = String((page as any)?.seoTitle || (page as any)?.seo_title || "").trim();
  const pageSeoDescription = String((page as any)?.seoDescription || (page as any)?.seo_description || "").trim();
  const title = pageSeoTitle || `关于我们｜${siteName}`;
  const description = pageSeoDescription
    || (page?.content ? truncateText(stripHtml(page.content), 150) : siteInfo.siteDescription || "了解平台信息、服务范围和联系方式。");

  return (
    <div className="min-h-screen bg-background pb-6">
      <SeoHead
        title={title}
        description={description}
        canonical={buildCanonical("/about")}
        robots="index,follow"
      />
      <PageHeader title="关于我们" onBack={goBack} />
      <main className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {page?.content ? (
          <article className="prose prose-sm max-w-none rounded-2xl border border-border bg-card p-5 text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(page.content) }} />
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold text-foreground">{siteName}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{siteInfo.siteSlogan || "官方商品与服务平台"}</p>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
              {siteInfo.siteDescription || "本平台提供商品、服务与客户支持信息。你可以通过页面说明了解商品、服务流程、使用规则和联系方式。"}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
