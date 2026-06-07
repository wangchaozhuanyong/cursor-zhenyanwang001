import { useEffect, useState } from "react";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import PageHeader from "@/components/PageHeader";
import { STORE_READING_MAIN_CLASS } from "@/constants/storeLayout";
import * as contentService from "@/services/contentService";
import type { ContentPage } from "@/types/content";
import { stripHtml, truncateText } from "@/utils/seo";
import { sanitizeCmsHtml } from "@/utils/cmsSanitizer";
import { isAboutPlaceholderBody } from "@/constants/helpCenterConfig";
import { STORE_COPY } from "@/constants/storeCopy";

export default function About() {
  const goBack = useGoBack();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const [page, setPage] = useState<ContentPage | null>(null);

  useEffect(() => {
    contentService.fetchContentBySlug("about").then((p) => setPage(p ?? null)).catch(() => setPage(null));
  }, []);

  const pageSeoTitle = String((page as any)?.seoTitle || (page as any)?.seo_title || "").trim();
  const pageSeoDescription = String((page as any)?.seoDescription || (page as any)?.seo_description || "").trim();
  const title = pageSeoTitle || `关于我们｜${siteName}`;
  const description = pageSeoDescription
    || (page?.content ? truncateText(stripHtml(page.content), 150) : siteInfo.siteDescription || "了解平台信息、服务范围和联系方式。");

  const cmsBody = page?.content && !isAboutPlaceholderBody(page.content) ? page.content : null;

  return (
    <div className="min-h-screen bg-background pb-6">
      <SeoHead
        title={title}
        description={description}
        canonical={buildCanonical("/about")}
        robots="index,follow"
      />
      <PageHeader
        title="关于我们"
        onBack={goBack}
        contentClassName="lg:max-w-3xl lg:px-8"
        backButtonClassName="lg:left-8"
      />
      <main className={`${STORE_READING_MAIN_CLASS} space-y-4`}>
        {cmsBody ? (
          <article className="store-body-text max-w-none rounded-2xl border border-border bg-card p-5 leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(cmsBody) }} />
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold text-foreground">{siteName}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{siteInfo.siteSlogan || STORE_COPY.siteSlogan}</p>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
              {siteInfo.siteDescription || STORE_COPY.siteDescription}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
