import { Clock3, MapPin, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { usePublicLocale } from "@/i18n/publicLocale";
import * as contentService from "@/services/contentService";
import type { ContentPage } from "@/types/content";
import { sanitizeCmsHtml } from "@/utils/cmsSanitizer";
import { buildCanonical, stripHtml, truncateText } from "@/utils/seo";
import { STORE_COPY } from "@/constants/storeCopy";

const deliveryZones = [
  {
    title: "西马配送",
    description: "适用于 Kuala Lumpur、Selangor、Johor、Penang 等西马州属。",
    meta: "结算页按州属、城市、邮编、重量和订单金额实时计算",
    icon: MapPin,
  },
  {
    title: "东马配送",
    description: "适用于 Sabah、Sarawak、Labuan 等东马区域。",
    meta: "部分商品、重量或地址可能不可配送，以结算页为准",
    icon: Truck,
  },
  {
    title: "物流轨迹",
    description: "订单发货后可在订单详情进入物流轨迹页查看最新节点。",
    meta: "后台填写物流单号和轨迹后同步展示",
    icon: PackageCheck,
  },
];

const ruleItems = [
  "运费会在结算页自动计算。",
  "地址需要包含州属、城市、邮编和手机号，避免配送规则匹配失败。",
  "库存、活动和运费会在提交订单前确认。",
  "限制类商品、超重商品或特殊地址可能出现不可配送提示。",
];

export default function Delivery() {
  const goBack = useGoBack("/");
  const navigate = useNavigate();
  const { localizedPath } = usePublicLocale();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const [page, setPage] = useState<ContentPage | null>(null);

  useEffect(() => {
    let active = true;
    contentService
      .fetchContentBySlug("shipping-policy")
      .then((result) => {
        if (active) setPage(result ?? null);
      })
      .catch(() => {
        if (active) setPage(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasCmsDelivery = Boolean(page?.content?.trim());
  const seoDescription = useMemo(() => {
    if (page?.content) return truncateText(stripHtml(page.content), 150);
    return `${siteName} 配送方式、东西马配送说明、地址填写和物流轨迹说明。`;
  }, [page?.content, siteName]);

  return (
    <StoreStandardPageShell
      title="配送方式"
      onBack={goBack}
      backFallback="/"
      className="store-v12-page store-delivery-v12-page"
      contentClassName="md:max-w-5xl xl:max-w-6xl"
    >
      <SeoHead
        title={`配送方式｜${siteName}`}
        description={seoDescription}
        canonical={buildCanonical("/delivery")}
        robots="index,follow"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="store-v12-info-hero">
          <span className="store-v12-eyebrow">
            <Truck size={15} aria-hidden />
            配送规则
          </span>
          <h2>{page?.title || "东西马配送在结算页确认"}</h2>
          <p>
            {hasCmsDelivery ? "配送说明由后台内容页维护；实际运费、不可配送原因和物流进度会随订单更新。" : "这里展示配送说明和地址准备状态；实际运费、不可配送原因和物流进度会随订单更新。"}
          </p>
          <div className="store-v12-hero-actions">
            <UnifiedButton type="button" onClick={() => navigate(localizedPath("/address"))} className="store-v12-primary-action">
              管理收货地址
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => navigate(localizedPath("/help"))} className="store-v12-secondary-action">
              查看帮助
            </UnifiedButton>
          </div>
        </section>

        <aside className="store-v12-info-card">
          <div className="store-v12-card-title">
            <ShieldCheck size={18} aria-hidden />
            结算安全规则
          </div>
          <p className="store-v12-muted">
            商品页、购物车展示的配送信息只是提示；创建订单前会确认地址、库存、活动和运费。
          </p>
        </aside>
      </div>

      {hasCmsDelivery ? (
        <section className="store-v12-info-card mt-4">
          <article
            className="store-body-text store-content-v12-article max-w-none leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold"
            dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(page?.content || "") }}
          />
        </section>
      ) : (
        <>
          <section className="store-v12-grid mt-4">
            {deliveryZones.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="store-v12-info-card">
                  <span className="store-v12-card-icon" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <small>{item.meta}</small>
                </article>
              );
            })}
          </section>

          <section className="store-v12-info-card mt-4">
            <div className="store-v12-card-title">
              <Clock3 size={18} aria-hidden />
              下单前需要知道
            </div>
            <div className="store-v12-list">
              {ruleItems.map((item) => (
                <div key={item} className="store-v12-list-row">
                  <span className="store-v12-dot" aria-hidden />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </StoreStandardPageShell>
  );
}
