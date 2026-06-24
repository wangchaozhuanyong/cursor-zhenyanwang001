import { useEffect, useState } from "react";
import { FileText, LayoutPanelTop, MessageSquare, ShieldCheck } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import * as contentService from "@/services/contentService";
import type { ContentPage } from "@/types/content";
import { stripHtml, truncateText } from "@/utils/seo";
import { sanitizeCmsHtml } from "@/utils/cmsSanitizer";
import { isAboutPlaceholderBody } from "@/constants/helpCenterConfig";
import { STORE_COPY } from "@/constants/storeCopy";
import BalanceFolio from "@/modules/storefront-v2/design/components/BalanceFolio";

const informationItems = [
  {
    title: "品牌介绍",
    description: "站点名称、口号与平台说明",
    icon: FileText,
  },
  {
    title: "服务范围",
    description: "商品、配送与客户服务范围",
    icon: LayoutPanelTop,
  },
  {
    title: "联系我们",
    description: "仅展示已配置的真实联系方式",
    icon: MessageSquare,
  },
];

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
    <StoreStandardPageShell
      title="关于我们"
      onBack={goBack}
      backFallback="/profile"
      contentClassName="sf-next-account-main md:max-w-3xl xl:max-w-4xl"
      className="sf-next-page store-v12-page store-content-v12-page store-about-v12-page"
    >
      <SeoHead
        title={title}
        description={description}
        canonical={buildCanonical("/about")}
        robots="index,follow"
      />

      <div className="store-content-v12-stack">
        <BalanceFolio
          eyebrow="SILENT COMMERCE"
          value={siteName}
          caption={siteInfo.siteSlogan || STORE_COPY.siteSlogan}
          meta={[
            { label: "内容来源", value: cmsBody ? "CMS" : "站点配置" },
            { label: "页面状态", value: "公开" },
            { label: "服务范围", value: "商城" },
          ]}
          className="store-about-v12-folio"
        />

        {cmsBody ? (
          <article className="store-body-text store-content-v12-article" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(cmsBody) }} />
        ) : (
          <section className="store-content-v12-article">
            <div className="store-v12-card-title">
              <FileText size={18} aria-hidden />
              平台说明
            </div>
            <p className="mt-3">{siteInfo.siteDescription || STORE_COPY.siteDescription}</p>
          </section>
        )}

        <section className="store-about-v12-info-section" aria-labelledby="about-info-title">
          <h2 className="store-v12-section-title" id="about-info-title">信息结构</h2>
          <div className="store-about-v12-info-list">
            {informationItems.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="store-about-v12-info-row">
                  <span className="store-v12-card-icon" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="store-v12-info-card">
          <div className="store-v12-card-title">
            <ShieldCheck size={18} aria-hidden />
            合规与安全
          </div>
          <p className="store-v12-muted">
            {siteInfo.complianceNotice || "所有订单、支付、配送和售后状态以系统记录为准；涉及账号与交易安全的问题请通过客服或帮助中心处理。"}
          </p>
        </section>
      </div>
    </StoreStandardPageShell>
  );
}
