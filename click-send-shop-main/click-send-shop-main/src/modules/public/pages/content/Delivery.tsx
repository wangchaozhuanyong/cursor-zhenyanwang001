import { MapPin, PackageCheck, ShieldCheck, Truck } from "lucide-react";
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
import "@/styles/secondary-routes.css";

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
  "地址需要包含州属、城市、邮编和手机号，避免配送规则匹配失败。",
  "手机号需要能正常联系，便于客服或物流确认。",
  "库存、活动和运费会在提交订单前确认。",
  "限制类商品、超重商品或特殊地址可能出现不可配送提示。",
];

const SHIPPING_PLACEHOLDER_MARKERS = [
  "请在后台",
  "内容管理",
  "维护配送政策正文",
  "这里展示配送说明",
];

function isShippingPlaceholderBody(body?: string | null): boolean {
  const text = String(body || "").trim();
  if (!text) return true;
  return SHIPPING_PLACEHOLDER_MARKERS.some((marker) => text.includes(marker));
}

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

  const cmsDeliveryBody = page?.content && !isShippingPlaceholderBody(page.content) ? page.content : "";
  const hasCmsDelivery = Boolean(cmsDeliveryBody);
  const seoDescription = useMemo(() => {
    if (page?.content) return truncateText(stripHtml(page.content), 150);
    return `${siteName} 配送方式、东西马配送说明、地址填写和物流轨迹说明。`;
  }, [page?.content, siteName]);

  return (
    <StoreStandardPageShell
      title="配送方式"
      onBack={goBack}
      backFallback="/"
      className="sf-next-page sf-next-route-page sf-next-delivery-page"
      contentClassName="sf-next-account-main md:max-w-5xl xl:max-w-6xl"
    >
      <SeoHead
        title={`配送方式｜${siteName}`}
        description={seoDescription}
        canonical={buildCanonical("/delivery")}
        robots="index,follow"
      />

      <div className="sf-next-delivery-lead">
        <section className="sf-next-info-hero">
          <span className="sf-next-eyebrow">
            <Truck size={15} aria-hidden />
            配送规则
          </span>
          <h2>{page?.title || "东西马配送在结算页确认"}</h2>
          <p>
            {hasCmsDelivery ? "配送说明由后台内容页维护；实际运费、不可配送原因和物流进度会随订单更新。" : "这里展示配送说明和地址准备状态；实际运费、不可配送原因和物流进度会随订单更新。"}
          </p>
          <div className="sf-next-hero-actions">
            <UnifiedButton type="button" onClick={() => navigate(localizedPath("/address"))} className="sf-next-primary-action">
              管理收货地址
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => navigate(localizedPath("/help"))} className="sf-next-secondary-action">
              查看帮助
            </UnifiedButton>
          </div>
        </section>

        <aside className="sf-next-info-card">
          <div className="sf-next-card-title">
            <ShieldCheck size={18} aria-hidden />
            结算安全规则
          </div>
          <p className="sf-next-muted">
            商品页、购物车展示的配送信息只是提示；创建订单前会确认地址、库存、活动和运费。
          </p>
        </aside>
      </div>

      {hasCmsDelivery ? (
        <section className="sf-next-info-card mt-4" aria-labelledby="delivery-cms-title">
          <div className="sf-next-card-title" id="delivery-cms-title">
            <PackageCheck size={18} aria-hidden />
            配送政策正文
          </div>
          <article
            className="sf-next-body-text sf-next-content-article"
            dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(cmsDeliveryBody) }}
          />
        </section>
      ) : null}

      <section className="sf-next-delivery-section mt-4" aria-labelledby="delivery-zone-title">
        <h2 className="sf-next-section-title" id="delivery-zone-title">配送范围</h2>
        <div className="sf-next-info-grid">
          {deliveryZones.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="sf-next-info-card">
                <span className="sf-next-card-icon" aria-hidden>
                  <Icon size={20} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <small>{item.meta}</small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="sf-next-delivery-section mt-4" aria-labelledby="delivery-ready-title">
        <h2 className="sf-next-section-title" id="delivery-ready-title">准备地址</h2>
        <div className="sf-next-delivery-checklist">
          {ruleItems.map((item) => (
            <div key={item} className="sf-next-list-row">
              <span className="sf-next-dot" aria-hidden />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </StoreStandardPageShell>
  );
}
