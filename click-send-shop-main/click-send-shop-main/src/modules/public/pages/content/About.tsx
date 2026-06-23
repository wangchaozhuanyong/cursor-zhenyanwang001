import { useEffect, useState } from "react";
import { BadgeCheck, FileText, ShieldCheck } from "lucide-react";
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

const defaultPrinciples = [
  "商品、优惠、订单和售后信息以真实系统数据为准。",
  "页面展示不替代客服确认，关键操作会在提交前再次校验。",
  "账号、安全和配送相关说明优先使用后台已配置内容。",
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

        <section className="store-v12-info-card">
          <div className="store-v12-card-title">
            <BadgeCheck size={18} aria-hidden />
            服务原则
          </div>
          <div className="store-v12-list">
            {defaultPrinciples.map((item) => (
              <div key={item} className="store-v12-list-row">
                <span className="store-v12-dot" aria-hidden />
                <span>{item}</span>
              </div>
            ))}
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
