import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import * as contentService from "@/services/contentService";
import type { ContentPage } from "@/types/content";
import { useGoBack } from "@/hooks/useGoBack";
import ContactUsContent from "./ContactUsContent";
import SeoHead from "@/components/SeoHead";
import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import { buildCanonical, stripHtml, truncateText } from "@/utils/seo";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { sanitizeCmsHtml } from "@/utils/cmsSanitizer";
import { STORE_COPY } from "@/constants/storeCopy";
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";

const CONTACT_US_SLUG = "contact-us";

export default function ContentCmsPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const goBack = useGoBack();
  const siteInfo = useSiteInfo();
  const [page, setPage] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isContactUs = slug.trim() === CONTACT_US_SLUG;

  useEffect(() => {
    if (!slug.trim()) {
      setLoading(false);
      setError("缺少页面路径");
      return;
    }
    setLoading(true);
    setError(null);
    contentService
      .fetchContentBySlug(slug.trim())
      .then((p) => {
        setPage(p ?? null);
        if (!p && !isContactUs) setError("未找到该页面");
      })
      .catch(() => {
        setPage(null);
        if (!isContactUs) setError("加载失败");
      })
      .finally(() => setLoading(false));
  }, [slug, isContactUs]);

  const pageSeoTitle = String((page as any)?.seoTitle || (page as any)?.seo_title || "").trim();
  const pageSeoDescription = String((page as any)?.seoDescription || (page as any)?.seo_description || "").trim();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const title = pageSeoTitle || (page?.title ? `${page.title}｜${siteName}` : `内容页面｜${siteName}`);
  const description = useMemo(() => {
    if (pageSeoDescription) return truncateText(pageSeoDescription, 150);
    if (page?.content) return truncateText(stripHtml(page.content), 150);
    return siteInfo.siteDescription || STORE_COPY.siteDescription;
  }, [page?.content, pageSeoDescription, siteInfo.siteDescription]);
  const pageStatus = String((page as any)?.status || "").toLowerCase();
  const isNoindex = Boolean((page as any)?.noindex) || ["draft", "hidden", "private"].includes(pageStatus);
  const pageTitle = loading ? "加载中..." : page?.title || (isContactUs ? "联系我们" : "内容");

  return (
    <StoreStandardPageShell
      title={pageTitle}
      onBack={goBack}
      backFallback="/profile"
      contentClassName="md:max-w-3xl xl:max-w-4xl"
      className="store-v12-page store-content-v12-page pb-8"
    >
      <SeoHead
        title={title}
        description={description}
        canonical={buildCanonical(`/content/${slug}`)}
        robots={isNoindex ? "noindex,follow" : "index,follow"}
      />
      <div className="mx-auto w-full max-w-lg md:max-w-none">
        {error && !loading ? (
          <ClientEmptyState
            title={error}
            description="你可以返回上一页，或稍后刷新重试。"
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <ClientButton type="button" variant="secondary" onClick={goBack}>
                  返回上一页
                </ClientButton>
                <ClientButton type="button" onClick={() => window.location.reload()}>
                  重新加载
                </ClientButton>
              </div>
            }
          />
        ) : null}
        {page?.content && !loading && !error ? <article className="store-body-text store-content-v12-article max-w-none leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(page.content) }} /> : null}
        {isContactUs && !loading && !error ? <ContactUsContent intro={!page?.content ? "如需订单、支付、物流、售后等协助，请通过以下方式联系我们。" : undefined} /> : null}
      </div>
    </StoreStandardPageShell>
  );
}
